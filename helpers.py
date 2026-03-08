import cv2
import face_recognition
import sqlite3
import time
import os
import logging
import numpy as np
from scipy.spatial import distance
import argparse
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "instance", "eduguard.db")

# ------------------------------
# Logging Configuration
# ------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')

# ------------------------------
# Parse command line arguments
# ------------------------------
def parse_args():
    parser = argparse.ArgumentParser(description='EduGuard AI Attendance System')
    parser.add_argument('--external-db', type=str, default=DEFAULT_DB_PATH, 
                        help='Path to external database')
    parser.add_argument('--attendance-id', type=int, default=None,
                        help='Attendance ID to update')
    parser.add_argument('--result-file', type=str, default=None,
                        help='File to save results')
    return parser.parse_args()

# ------------------------------
# Attendance System Class
# ------------------------------
class AttendanceSystem:
    def __init__(self, 
                 db_file=DEFAULT_DB_PATH, 
                 detection_scale=0.25,   # Aggressive downscaling for detection to handle HD
                 process_every_n_frames=8,  # Process fewer frames to maintain smoothness with HD
                 attendance_cooldown=10, 
                 face_match_threshold=0.6,  # Keep threshold for matching
                 STATE_TIMEOUT=1.0,          # Timeout for stale tracker removal
                 TRANSITION_DETECTING=0.8,   # Time for "Detecting..." state
                 TRANSITION_PRESENT=1.5,     # Time after which attendance is marked
                 detection_model="hog",      # "hog" (faster) or "cnn" (more robust, requires GPU for speed)
                 enable_liveness_detection=False, # Disable for better performance
                 max_students=30,            # Maximum number of students to track simultaneously
                 face_verification_frequency=15,  # Verify less frequently for HD
                 verbose_logging=False,       # Disable verbose logging for better performance
                 enable_auto_zoom=True,      # Enable automatic zooming for distant faces
                 min_face_size_for_zoom=100,  # Increased threshold - zoom in on larger faces (was 60)
                 zoom_factor=3.0,            # Increased zoom factor (was 2.0)
                 show_zoom_regions=True,      # Show zoom regions visually
                 attendance_id=None,         # Attendance ID for web integration
                 result_file=None           # File to save results
                 ):
        self.db_file = db_file
        self.detection_scale = detection_scale
        self.process_every_n_frames = process_every_n_frames
        self.attendance_cooldown = attendance_cooldown
        self.face_match_threshold = face_match_threshold
        self.STATE_TIMEOUT = STATE_TIMEOUT
        self.TRANSITION_DETECTING = TRANSITION_DETECTING
        self.TRANSITION_PRESENT = TRANSITION_PRESENT
        self.detection_model = detection_model
        self.enable_liveness_detection = enable_liveness_detection
        self.max_students = max_students
        self.face_verification_frequency = face_verification_frequency
        self.verbose_logging = verbose_logging
        self.enable_auto_zoom = enable_auto_zoom
        self.min_face_size_for_zoom = min_face_size_for_zoom
        self.zoom_factor = zoom_factor
        self.show_zoom_regions = show_zoom_regions
        self.attendance_id = attendance_id
        self.result_file = result_file
        
        # Store face detections for liveness check
        self.consecutive_face_detections = {}
        
        self.frame_count = 0

        # Dictionary to store face tracking state.
        self.face_states = {}
        
        # Dictionary to keep track of marked attendance (to avoid verification for already marked students)
        self.attendance_marked = {}
        
        # Store previous frames for motion analysis
        self.prev_frame = None
        
        # Counter to limit excessive logging
        self.log_counter = 0
        self.removed_faces = []
        
        # Store face encodings to avoid recomputing
        self.face_encoding_cache = {}
        
        # Dynamic registered faces dictionary - will be updated on the fly
        self.registered_faces = {}
        
        # Pre-load face cascade for faster verification
        try:
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        except:
            self.face_cascade = None
            logging.warning("Could not load Haar cascade classifier. Will use slower fallback.")

        # Initialize database and load registered faces
        self.init_db()
        self.registered_faces = self.load_registered_students()
        # Attempt backfill from stored images if none loaded
        if len(self.registered_faces) == 0:
            upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'dataset')
            self.backfill_missing_encodings_from_images(upload_folder)
        logging.info("Loaded registered faces: %s", list(self.registered_faces.keys()))
        self.initialize_db_with_registered_students()

        # Initialize camera with better error handling and fallback options
        self.init_camera()
            
    def init_camera(self):
        """Initialize camera with improved detection and error handling"""
        # Try to open available cameras until one works
        for camera_index in range(3):  # Try first 3 camera indices (0, 1, 2)
            logging.info(f"Trying to initialize camera at index {camera_index}")
            try:
                self.camera = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)  # Use DirectShow for faster initialization
                
                if self.camera.isOpened():
                    # Set camera properties for HD resolution
                    self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)  # HD width
                    self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)  # HD height
                    self.camera.set(cv2.CAP_PROP_FPS, 30)  # Request 30 FPS
                    self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer to reduce latency
                    
                    # Test camera by reading a frame
                    ret, test_frame = self.camera.read()
                    if ret and test_frame is not None and test_frame.size > 0:
                        logging.info(f"Successfully initialized camera {camera_index} at HD resolution")
                        return
                    else:
                        self.camera.release()
            except Exception as e:
                logging.error(f"Error initializing camera {camera_index}: {str(e)}")
                if hasattr(self, 'camera') and self.camera is not None:
                    self.camera.release()
            
        # If all attempts failed, try with default settings
        logging.warning("Failed to initialize camera with HD settings. Trying default settings.")
        try:
            self.camera = cv2.VideoCapture(0)
            # Try HD resolution
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            
            if not self.camera.isOpened():
                logging.error("Unable to open any camera. Check your camera connection.")
                raise Exception("Unable to open camera. Please make sure your camera is connected and not in use by another application.")
        except Exception as e:
            logging.error(f"Error opening default camera: {str(e)}")
            raise

    def create_tracker(self, frame, bbox):
        """
        Creates and initializes a tracker using the provided frame and bbox.
        Tries OpenCV CSRT/KCF and falls back to dlib's correlation tracker.
        bbox format: (x, y, w, h) where (x,y) is top-left.
        Returns a tuple (tracker, tracker_type).
        """
        tracker = None
        tracker_type = None
        # Try OpenCV CSRT
        try:
            tracker = cv2.TrackerCSRT_create()
            tracker_type = "cv2"
        except AttributeError:
            try:
                tracker = cv2.legacy.TrackerCSRT_create()
                tracker_type = "cv2"
            except AttributeError:
                pass

        # Fallback to OpenCV KCF if CSRT not available
        if tracker is None:
            try:
                tracker = cv2.TrackerKCF_create()
                tracker_type = "cv2"
            except AttributeError:
                try:
                    tracker = cv2.legacy.TrackerKCF_create()
                    tracker_type = "cv2"
                except AttributeError:
                    pass

        # If no OpenCV tracker found, try dlib
        if tracker is None:
            try:
                import dlib
                tracker = dlib.correlation_tracker()
                x, y, w, h = bbox
                rect = dlib.rectangle(x, y, x + w, y + h)
                tracker.start_track(frame, rect)
                tracker_type = "dlib"
            except ImportError:
                raise Exception("No suitable tracker found. Please install opencv-contrib-python or dlib.")

        return tracker, tracker_type

    def init_db(self):
        """
        Initialize the database connection.
        """
        try:
            print(f"Connecting to database: {self.db_file}")
            if not os.path.exists(self.db_file):
                print(f"WARNING: Database file does not exist: {self.db_file}")
            
            # Enable row access by name for convenience
            self.conn = sqlite3.connect(self.db_file)
            self.conn.row_factory = sqlite3.Row
            self.cursor = self.conn.cursor()
            
            # Print database version to verify connection
            self.cursor.execute("SELECT sqlite_version();")
            version = self.cursor.fetchone()
            print(f"Connected to SQLite version: {version[0]}")
            
            # Check if student table exists (support both lowercase and capitalized)
            student_table_exists = False
            self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='student';")
            row = self.cursor.fetchone()
            if row:
                self.student_table_name = 'student'
                student_table_exists = True
            else:
                self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Student';")
                row = self.cursor.fetchone()
                if row:
                    self.student_table_name = 'Student'
                    student_table_exists = True
                else:
                    self.student_table_name = 'student'
            print(f"Student table exists: {student_table_exists}")
            
            if student_table_exists:
                # Check if face_encoding column exists in student table
                self.cursor.execute(f"PRAGMA table_info({self.student_table_name})")
                columns = self.cursor.fetchall()
                face_encoding_exists = any(col[1] == 'face_encoding' for col in columns)
                print(f"face_encoding column exists: {face_encoding_exists}")
                
                if not face_encoding_exists:
                    print("ERROR: face_encoding column not found in student table!")
            
            self.conn.commit()
        except Exception as e:
            print(f"Database initialization error: {str(e)}")

    def load_registered_students(self):
        """
        Load registered students' face encodings from the database.
        """
        registered_faces = {}
        # Map student_id -> name for display
        self.student_id_to_name = {}
        
        try:
            print(f"Database file: {self.db_file}")
            
            # Determine if we should scope students to a class via attendance_id
            class_id_filter = None
            if self.attendance_id is not None:
                # Detect attendance table name (lowercase fallback)
                attendance_table_name = 'attendance'
                try:
                    self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance';")
                    row = self.cursor.fetchone()
                    if not row:
                        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Attendance';")
                        row = self.cursor.fetchone()
                        if row:
                            attendance_table_name = 'Attendance'
                except Exception:
                    attendance_table_name = 'attendance'

                # Fetch class_id for this attendance session
                try:
                    self.cursor.execute(f"SELECT class_id FROM {attendance_table_name} WHERE id = ?", (self.attendance_id,))
                    row = self.cursor.fetchone()
                    if row:
                        class_id_filter = row[0]
                        print(f"Scoping face encodings to class_id={class_id_filter} for attendance_id={self.attendance_id}")
                except Exception as e:
                    print(f"Warning: unable to read class_id for attendance_id {self.attendance_id}: {str(e)}")

            student_table = getattr(self, 'student_table_name', 'student')
            if class_id_filter is not None:
                query = f"SELECT id, student_id, name, face_encoding FROM {student_table} WHERE face_encoding IS NOT NULL AND class_id = ?"
                print(f"Running query (scoped): {query} [class_id={class_id_filter}]")
                self.cursor.execute(query, (class_id_filter,))
            else:
                # Get all students with face encodings from detected table name
                query = f"SELECT id, student_id, name, face_encoding FROM {student_table} WHERE face_encoding IS NOT NULL"
                print(f"Running query: {query}")
                self.cursor.execute(query)
            
            rows = self.cursor.fetchall()
            print(f"Query returned {len(rows)} rows")
            
            for row in rows:
                student_db_id = row[0]
                student_id = row[1]
                student_name = row[2]
                encoding_json = row[3]
                if encoding_json:
                    try:
                        # Parse JSON encoding from student table
                        print(f"Student ID: {student_id}")
                        encoding_array = json.loads(encoding_json)
                        encoding = np.array(encoding_array)
                        
                        # Store with student_id as key
                        registered_faces[student_id] = [encoding]
                        self.student_id_to_name[student_id] = student_name
                        print(f"Successfully loaded face for student: {student_id}")
                    except Exception as e:
                        print(f"Error parsing encoding for {student_id}: {str(e)}")
        except Exception as e:
            print(f"Database error: {str(e)}")
        
        # Log the loaded students
        student_list = list(registered_faces.keys())
        print(f"Loaded {len(student_list)} students: {student_list}")
        return registered_faces

    def backfill_missing_encodings_from_images(self, upload_folder):
        """
        If there are students without encodings but with stored images, try to compute and cache encodings.
        """
        try:
            table_name = getattr(self, 'student_table_name', 'student')
            self.cursor.execute(f"SELECT student_id, name, image_file FROM {table_name} WHERE (face_encoding IS NULL OR face_encoding = '') AND image_file IS NOT NULL")
            rows = self.cursor.fetchall()
            if not rows:
                return
            print(f"Found {len(rows)} students with images but no encodings. Backfilling...")
            for row in rows:
                student_id, name, image_file = row
                image_path = os.path.join(upload_folder, image_file)
                if not os.path.exists(image_path):
                    continue
                try:
                    image = face_recognition.load_image_file(image_path)
                    encodings = face_recognition.face_encodings(image)
                    if encodings:
                        encoding_json = json.dumps(encodings[0].tolist())
                        self.cursor.execute(f"UPDATE {table_name} SET face_encoding = ? WHERE student_id = ?", (encoding_json, student_id))
                        self.conn.commit()
                        # Update in-memory maps
                        self.registered_faces.setdefault(student_id, []).append(np.array(json.loads(encoding_json)))
                        self.student_id_to_name[student_id] = name
                        print(f"Backfilled encoding for {student_id} ({name})")
                except Exception:
                    continue
        except Exception as e:
            print(f"Backfill error: {str(e)}")

    def save_face_encoding(self, student_id, face_encoding):
        """Save a face encoding to the database"""
        encoding_blob = face_encoding.tobytes()
        try:
            self.cursor.execute("INSERT INTO face_encodings (student_id, encoding) VALUES (?, ?)",
                              (student_id, encoding_blob))
            self.conn.commit()
            logging.info(f"Saved face encoding for student: {student_id}")
            return True
        except Exception as e:
            logging.error(f"Error saving face encoding: {str(e)}")
            return False

    def initialize_db_with_registered_students(self):
        """
        For each registered student, ensure there is at least one record.
        """
        # Skip legacy initialization when running in web-integrated mode
        if self.attendance_id is None:
            try:
                for student_id in self.registered_faces.keys():
                    self.cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ?", (student_id,))
                    row = self.cursor.fetchone()
                    count = row[0] if row else 0
                    if count == 0:
                        self.cursor.execute("INSERT INTO attendance (student_id, timestamp) VALUES (?, ?)", (student_id, 0))
                self.conn.commit()
            except Exception:
                # Silently ignore if legacy table doesn't exist in ORM schema
                self.conn.rollback()

    def mark_attendance(self, student_id, current_time):
        """Insert a new attendance record for the given student."""
        logging.info("Marking attendance for %s at %s", student_id, current_time)
        
        # Use the specific attendance_id if provided
        if self.attendance_id is not None:
            # Update the AttendanceRecord in the web database
            try:
                # First, get the student's database ID from their student_id
                table_name = getattr(self, 'student_table_name', 'student')
                self.cursor.execute(f"""
                    SELECT id FROM {table_name} WHERE student_id = ?
                """, (student_id,))
                student_db_id = self.cursor.fetchone()
                
                if student_db_id:
                    student_db_id = student_db_id[0]  # Extract the ID from the tuple
                    # Update the attendance record
                    # Attendance record table is created by SQLAlchemy, default lowercase with underscores
                    self.cursor.execute("""
                        UPDATE attendance_record 
                        SET status = 1 
                        WHERE attendance_id = ? AND student_id = ?
                    """, (self.attendance_id, student_db_id))
                    self.conn.commit()
                    
                    # Save to results file if provided
                    if self.result_file:
                        self.save_attendance_results(student_id)
                else:
                    logging.error(f"Student with ID {student_id} not found in database")
            except Exception as e:
                logging.error(f"Error updating attendance record: {str(e)}")
        else:
            # Legacy mode - insert directly
            self.cursor.execute("INSERT INTO attendance (student_id, timestamp) VALUES (?, ?)", (student_id, current_time))
            self.conn.commit()
        
        # Add to our attendance marked dictionary
        self.attendance_marked[student_id] = current_time

    def save_attendance_results(self, student_id):
        """Save attendance results to the specified file"""
        try:
            results = {}
            if os.path.exists(self.result_file):
                with open(self.result_file, 'r') as f:
                    results = json.load(f)
            
            if 'marked_students' not in results:
                results['marked_students'] = []
                
            if student_id not in results['marked_students']:
                results['marked_students'].append(student_id)
                
            with open(self.result_file, 'w') as f:
                json.dump(results, f)
        except Exception as e:
            logging.error(f"Error saving results to {self.result_file}: {str(e)}")

    def enhance_frame(self, frame):
        """Enhanced frame with lighting correction, optimized for speed"""
        # Skip enhancement for best performance
        return frame
            
    def align_face(self, image, face_location):
        top, right, bottom, left = face_location
        face_image = image[top:bottom, left:right]
        landmarks_list = face_recognition.face_landmarks(face_image)
        if not landmarks_list:
            return None
        landmarks = landmarks_list[0]
        left_eye = np.mean(landmarks['left_eye'], axis=0)
        right_eye = np.mean(landmarks['right_eye'], axis=0)
        delta_y = right_eye[1] - left_eye[1]
        delta_x = right_eye[0] - left_eye[0]
        angle = np.degrees(np.arctan2(delta_y, delta_x))
        def rotate_bound(image, angle):
            (h, w) = image.shape[:2]
            (cX, cY) = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D((cX, cY), -angle, 1.0)
            cos = np.abs(M[0, 0])
            sin = np.abs(M[0, 1])
            nW = int((h * sin) + (w * cos))
            nH = int((h * cos) + (w * sin))
            M[0, 2] += (nW / 2) - cX
            M[1, 2] += (nH / 2) - cY
            return cv2.warpAffine(image, M, (nW, nH))
        aligned_face = rotate_bound(face_image, angle)
        return aligned_face

    def get_aligned_face_encoding(self, image, face_location):
        """
        Align the face in the image and return its encoding.
        """
        aligned_face = self.align_face(image, face_location)
        if aligned_face is None:
            return None
        if aligned_face.shape[0] < 20 or aligned_face.shape[1] < 20:
            return None
        face_locations = face_recognition.face_locations(aligned_face)
        if not face_locations:
            return None 
        encodings = face_recognition.face_encodings(aligned_face, face_locations)
        return encodings[0] if encodings else None

    def detect_liveness(self, frame, face_location, face_encoding=None):
        """
        Simplified liveness detection for better performance
        """
        if not self.enable_liveness_detection:
            return True
            
        top, right, bottom, left = face_location
        
        # Skip liveness check if face is too small or invalid dimensions
        face_height = bottom - top
        face_width = right - left
        if face_height < 50 or face_width < 50 or top >= bottom or left >= right:
            return True
            
        # Make sure coordinates are within frame boundaries
        height, width = frame.shape[:2]
        if top < 0 or left < 0 or bottom >= height or right >= width:
            return True
            
        # Just check texture variation for best performance
        try:
            face = frame[top:bottom, left:right]
            gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
            blur_variance = cv2.Laplacian(gray, cv2.CV_64F).var()
            return blur_variance > 50.0  # Lower threshold for better detection rate
        except:
            return True
    
    def eye_aspect_ratio(self, eye):
        """Calculate eye aspect ratio to detect blinks"""
        # Compute the euclidean distances between eye landmark points
        A = distance.euclidean(eye[1], eye[5])
        B = distance.euclidean(eye[2], eye[4])
        C = distance.euclidean(eye[0], eye[3])
        
        # Eye aspect ratio
        ear = (A + B) / (2.0 * C)
        return ear
    
    def check_face_movement(self, student_id, face_location):
        """
        Check if a face has normal movement patterns.
        Returns True if movement is natural, False if suspiciously static
        """
        if student_id not in self.consecutive_face_detections:
            self.consecutive_face_detections[student_id] = []
        
        # Add current location
        self.consecutive_face_detections[student_id].append(face_location)
        
        # Keep only recent detections
        if len(self.consecutive_face_detections[student_id]) > 10:
            self.consecutive_face_detections[student_id].pop(0)
        
        # Not enough data yet
        if len(self.consecutive_face_detections[student_id]) < 5:
            return True
        
        # Calculate movement variance
        locations = np.array(self.consecutive_face_detections[student_id])
        
        # Check center points of each face detection
        centers = []
        for (top, right, bottom, left) in locations:
            center_x = (left + right) // 2
            center_y = (top + bottom) // 2
            centers.append((center_x, center_y))
        
        centers = np.array(centers)
        
        # Calculate variance of movement
        x_var = np.var(centers[:, 0])
        y_var = np.var(centers[:, 1])
        
        # Extremely low variance could indicate a static image
        return x_var > 1.0 or y_var > 1.0
        
    def verify_face_still_present(self, frame, face_location, threshold=0.3):
        """
        Verify if a face is still present at the given location
        Uses faster verification methods optimized for performance
        """
        top, right, bottom, left = face_location
        
        # Check if the region is valid
        if top >= bottom or left >= right:
            return False
            
        # Make sure coordinates are within frame boundaries
        height, width = frame.shape[:2]
        if top < 0 or left < 0 or bottom >= height or right >= width:
            return True
                    
        # Performance optimization: use Haar cascades which are much faster than face_recognition
        if self.face_cascade is not None:
            try:
                face_region = frame[top:bottom, left:right]
                gray_region = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray_region, 1.1, 4, minSize=(30, 30))
                return len(faces) > 0
            except:
                pass
                
        # Fallback to face_recognition if needed
        try:
            face_region = frame[top:bottom, left:right]
            rgb_region = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_region, model="hog")
            return len(face_locations) > 0
        except:
            return False
            
    def detect_faces_in_frame(self, frame, scale_factor):
        """Helper method to detect faces in a given frame with specified scale"""
        # Fast resize based on detection_scale for better performance with HD
        if scale_factor != 1.0:
            # Use INTER_AREA for downsampling - better quality for HD downscaling
            resized_frame = cv2.resize(frame, (0, 0), fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_AREA)
        else:
            resized_frame = frame
            
        rgb_frame = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2RGB)
        
        # Use selected detection model with increased upsample for better detection
        if self.detection_model == "cnn":
            face_locations = face_recognition.face_locations(rgb_frame, model="cnn")
        else:
            # Regular upsample for better performance
            face_locations = face_recognition.face_locations(rgb_frame, model="hog", number_of_times_to_upsample=1)
            
        # If no faces detected with face_recognition, try OpenCV's Haar cascade as fallback
        if len(face_locations) == 0 and self.face_cascade is not None:
            try:
                gray = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2GRAY)
                cv_faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
                
                # Convert OpenCV face detections to face_recognition format (top, right, bottom, left)
                for (x, y, w, h) in cv_faces:
                    face_locations.append((y, x+w, y+h, x))
            except Exception as e:
                pass
        
        adj_scale_factor = 1 / scale_factor
        processed_faces = []
        
        for face_location in face_locations:
            top, right, bottom, left = face_location
            # Adjust coordinates back to original frame size
            top = int(top * adj_scale_factor)
            right = int(right * adj_scale_factor)
            bottom = int(bottom * adj_scale_factor)
            left = int(left * adj_scale_factor)
            
            # Skip small faces (likely too far or low quality)
            face_height = bottom - top
            if face_height < 20:  # Reduced minimum size threshold
                continue
                
            # Get aligned encoding first
            adjusted_face_location = (top, right, bottom, left)
            
            # Check cache first to avoid redundant face encoding
            face_region_str = f"{top}_{right}_{bottom}_{left}_{self.frame_count}"
            aligned_encoding = self.face_encoding_cache.get(face_region_str)
            
            if aligned_encoding is None:
                try:
                    # Try direct encoding without alignment for more reliable detection
                    # For HD, extract face and downscale it for faster encoding
                    face_img = frame[top:bottom, left:right]
                    if face_img.size > 0:
                        # Downscale large face images for faster processing
                        if face_img.shape[0] > 150 or face_img.shape[1] > 150:
                            face_img = cv2.resize(face_img, (0, 0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
                            
                        rgb_face = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
                        face_encodings = face_recognition.face_encodings(rgb_face)
                        if face_encodings:
                            aligned_encoding = face_encodings[0]
                        else:
                            # Fall back to get_aligned_face_encoding
                            aligned_encoding = self.get_aligned_face_encoding(rgb_frame, adjusted_face_location)
                    else:
                        aligned_encoding = self.get_aligned_face_encoding(rgb_frame, adjusted_face_location)
                except Exception as e:
                    continue
                    
                # Cache the encoding if valid
                if aligned_encoding is not None:
                    self.face_encoding_cache[face_region_str] = aligned_encoding
                    # Clear old cache entries occasionally
                    if len(self.face_encoding_cache) > 100:
                        self.face_encoding_cache = {}
            
            if aligned_encoding is not None:
                # Skip liveness detection temporarily to ensure we get detections
                processed_faces.append((adjusted_face_location, aligned_encoding))
        
        return processed_faces
        
    def get_zoomed_regions(self, frame):
        """
        Detect potential face regions that are far away and create zoomed versions
        Returns a list of tuples: [(zoomed_frame, top, right, bottom, left, zoom_factor), ...]
        """
        if not self.enable_auto_zoom:
            self.current_zoom_regions = []  # Clear zoom regions when disabled
            return []
            
        # Use Haar cascade for quick face detection (much faster than face_recognition)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = []
        
        try:
            # Try to detect faces with Haar cascade first (faster)
            if self.face_cascade is not None:
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(20, 20))
        except Exception as e:
            pass
            
        # If no faces found with Haar, try a lightweight HOG detector
        if len(faces) == 0:
            try:
                # Use a smaller scale for faster detection
                small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
                
                # Convert back to original frame coordinates
                for top, right, bottom, left in face_locations:
                    # Scale back up
                    top *= 4
                    right *= 4
                    bottom *= 4
                    left *= 4
                    faces.append((left, top, right-left, bottom-top))
            except Exception as e:
                pass
                
        # Process detected faces
        zoomed_regions = []
        height, width = frame.shape[:2]
        
        # Store zoom regions for visualization
        self.current_zoom_regions = []
        
        # Always create at least one zoom region in the center if no faces detected
        if len(faces) == 0 and self.frame_count % 30 == 0:  # Every 30 frames
            # Create a center region zoom
            center_x = width // 2
            center_y = height // 2
            zoom_size = min(width, height) // 3
            
            zoom_left = max(0, center_x - zoom_size // 2)
            zoom_top = max(0, center_y - zoom_size // 2)
            zoom_right = min(width, center_x + zoom_size // 2)
            zoom_bottom = min(height, center_y + zoom_size // 2)
            
            region = frame[zoom_top:zoom_bottom, zoom_left:zoom_right]
            if region.size > 0:
                zoomed = cv2.resize(region, (0, 0), fx=self.zoom_factor, fy=self.zoom_factor)
                zoomed_regions.append((zoomed, zoom_top, zoom_right, zoom_bottom, zoom_left, self.zoom_factor))
                
                # Store for visualization
                self.current_zoom_regions.append((zoom_top, zoom_right, zoom_bottom, zoom_left))
        
        for (x, y, w, h) in faces:
            # Check if face is small enough to need zooming - now we zoom on ALL faces
            # This makes the feature more visible to the user
            if w < self.min_face_size_for_zoom or h < self.min_face_size_for_zoom:
                # Calculate zoom region with padding
                center_x = x + w // 2
                center_y = y + h // 2
                
                # Calculate zoom region size (larger than the face)
                zoom_size = max(w, h) * 3  # 3x the face size for context (was 2x)
                
                # Calculate zoom region boundaries
                zoom_left = max(0, center_x - zoom_size // 2)
                zoom_top = max(0, center_y - zoom_size // 2)
                zoom_right = min(width, center_x + zoom_size // 2)
                zoom_bottom = min(height, center_y + zoom_size // 2)
                
                # Extract region
                region = frame[zoom_top:zoom_bottom, zoom_left:zoom_right]
                
                # Skip if region is empty
                if region.size == 0:
                    continue
                    
                # Create zoomed version
                zoomed = cv2.resize(region, (0, 0), fx=self.zoom_factor, fy=self.zoom_factor)
                
                # Add to list with original coordinates for mapping back
                zoomed_regions.append((zoomed, zoom_top, zoom_right, zoom_bottom, zoom_left, self.zoom_factor))
                
                # Store for visualization
                self.current_zoom_regions.append((zoom_top, zoom_right, zoom_bottom, zoom_left))
                
        return zoomed_regions

    def process_frame(self, frame):
        """
        Enhanced frame processing with automatic zooming for distant faces
        """
        # Process original frame with specified scale
        processed_faces = self.detect_faces_in_frame(frame, self.detection_scale)
        
        # Get zoomed regions for distant faces
        zoomed_regions = self.get_zoomed_regions(frame)
        
        # Process each zoomed region
        for zoomed_frame, r_top, r_right, r_bottom, r_left, zoom_factor in zoomed_regions:
            # Process the zoomed frame at full resolution
            zoomed_faces = self.detect_faces_in_frame(zoomed_frame, 1.0)
            
            # Convert coordinates back to original frame
            for (z_top, z_right, z_bottom, z_left), face_encoding in zoomed_faces:
                # Convert back to original frame coordinates
                orig_top = int(r_top + z_top / zoom_factor)
                orig_right = int(r_left + z_right / zoom_factor)
                orig_bottom = int(r_top + z_bottom / zoom_factor)
                orig_left = int(r_left + z_left / zoom_factor)
                
                # Check if this face overlaps with any already detected face
                is_duplicate = False
                for (f_top, f_right, f_bottom, f_left), _ in processed_faces:
                    # Calculate overlap
                    overlap_left = max(f_left, orig_left)
                    overlap_top = max(f_top, orig_top)
                    overlap_right = min(f_right, orig_right)
                    overlap_bottom = min(f_bottom, orig_bottom)
                    
                    # Check if there's an overlap
                    if overlap_left < overlap_right and overlap_top < overlap_bottom:
                        overlap_area = (overlap_right - overlap_left) * (overlap_bottom - overlap_top)
                        orig_area = (orig_right - orig_left) * (orig_bottom - orig_top)
                        
                        # If significant overlap, consider it a duplicate
                        if overlap_area > 0.5 * orig_area:
                            is_duplicate = True
                            break
                
                if not is_duplicate:
                    processed_faces.append(((orig_top, orig_right, orig_bottom, orig_left), face_encoding))
        
        return processed_faces

    def improve_tracker(self, frame, student_id, state):
        """Try to recover tracking for a student by looking nearby"""
        if 'tracker_bbox' not in state:
            return False
            
        top, right, bottom, left = state['tracker_bbox']
        height, width = frame.shape[:2]
        
        # Calculate expanded search region with a margin
        face_width = right - left
        face_height = bottom - top
        margin_x = int(face_width * 0.3)
        margin_y = int(face_height * 0.3)
        
        # Ensure search region is within frame bounds
        search_left = max(0, left - margin_x)
        search_top = max(0, top - margin_y)
        search_right = min(width, right + margin_x)
        search_bottom = min(height, bottom + margin_y)
        
        # Extract search region
        search_region = frame[search_top:search_bottom, search_left:search_right]
        
        # Try to find a face in the search region
        if search_region.size == 0:
            return False
            
        try:
            gray_region = cv2.cvtColor(search_region, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray_region, 1.1, 4, minSize=(30, 30))
            
            if len(faces) > 0:
                # Found a face - reinitialize tracker
                x, y, w, h = faces[0]
                # Convert back to original frame coordinates
                x += search_left
                y += search_top
                
                # Create new tracker
                tracker, tracker_type = self.create_tracker(frame, (x, y, w, h))
                state['tracker'] = tracker
                state['tracker_type'] = tracker_type
                state['tracker_bbox'] = (y, x+w, y+h, x)  # Convert to (top, right, bottom, left)
                state['last_seen'] = time.time()
                return True
        except:
            pass
            
        return False

    def run(self):
        """Main loop: update trackers, periodically re-run face detection, and draw bounding boxes."""
        logging.info("Attendance system running. Press 'q' to exit.")
        frame_time = 0  # Track processing time
        frames_processed = 0
        fps_update_counter = 0
        avg_fps = 0
        
        # Add a counter to force process every frame initially
        force_process_count = 5  # Process just a few frames initially
        
        # For HD processing, implement frame skipping for display
        display_every_n = 1  # Display every frame for full HD experience
        
        # Set the window title
        window_title = "EduGuard AI Attendance System"
        cv2.namedWindow(window_title, cv2.WINDOW_NORMAL)
        
        while True:
            start_time = time.time()
            
            ret, frame = self.camera.read()
            if not ret or frame is None or frame.size == 0:
                logging.warning("Failed to capture frame. Reinitializing camera...")
                # Try to reinitialize camera
                self.camera.release()
                cv2.waitKey(1000)  # Wait a second before retry
                self.init_camera()
                continue

            current_time = time.time()
            
            # Process frames based on settings or force process at the beginning
            process_this_frame = (self.frame_count % self.process_every_n_frames == 0) or (force_process_count > 0)
            
            if process_this_frame and force_process_count > 0:
                force_process_count -= 1
            
            if process_this_frame:
                # -----------------------------
                # 1. Update all existing trackers
                # -----------------------------
                self.removed_faces = []  # Reset list of removed faces for this frame
                
                for student_id in list(self.face_states.keys()):
                    state = self.face_states[student_id]
                    tracker_updated = False
                    
                    # First try the standard tracker update
                    if state['tracker_type'] == "cv2":
                        ok, bbox = state['tracker'].update(frame)
                        if ok:
                            x, y, w, h = bbox
                            top, left, bottom, right = int(y), int(x), int(y+h), int(x+w)
                            state['tracker_bbox'] = (top, right, bottom, left)
                            state['last_seen'] = current_time
                            tracker_updated = True
                        else:
                            # Try to recover tracking
                            tracker_updated = self.improve_tracker(frame, student_id, state)
                    elif state['tracker_type'] == "dlib":
                        state['tracker'].update(frame)
                        rect = state['tracker'].get_position()
                        left = int(rect.left())
                        top = int(rect.top())
                        right = int(rect.right())
                        bottom = int(rect.bottom())
                        state['tracker_bbox'] = (top, right, bottom, left)
                        state['last_seen'] = current_time
                        tracker_updated = True
                    
                    # Verify face presence periodically but not too often for performance
                    if tracker_updated and self.frame_count % self.face_verification_frequency == 0:
                        if not self.verify_face_still_present(frame, state['tracker_bbox']):
                            # Face is no longer present - remove tracker immediately
                            self.removed_faces.append(student_id)
                            del self.face_states[student_id]
                            if student_id in self.consecutive_face_detections:
                                del self.consecutive_face_detections[student_id]
                            continue
                            
                    # Remove stale trackers
                    if not tracker_updated or (current_time - state['last_seen'] >= self.STATE_TIMEOUT):
                        self.removed_faces.append(student_id)
                        del self.face_states[student_id]
                        if student_id in self.consecutive_face_detections:
                            del self.consecutive_face_detections[student_id]

                # -----------------------------
                # 2. Run face detection to find new faces or reinitialize trackers
                # -----------------------------
                faces = self.process_frame(frame)
                
                # Only use registered faces from the database - no auto-registration
                
                # Limit number of students to track (prioritize highest confidence matches)
                student_matches = []
                
                for (top, right, bottom, left), face_encoding in faces:
                    recognized_student = None
                    best_match_distance = float('inf')
                    
                    # Compare with registered encodings
                    for student, encodings in self.registered_faces.items():
                        matches = face_recognition.compare_faces(encodings, face_encoding, self.face_match_threshold)
                        if any(matches):
                            # Find the best match by computing distances
                            distances = face_recognition.face_distance(encodings, face_encoding)
                            min_distance = min(distances)
                            if min_distance < best_match_distance:
                                best_match_distance = min_distance
                                recognized_student = student
                    
                    if recognized_student is not None:
                        student_matches.append({
                            'student_id': recognized_student,
                            'confidence': 1.0 - best_match_distance,  # Convert distance to confidence
                            'face_location': (top, right, bottom, left),
                            'face_encoding': face_encoding
                        })
                
                # Sort by confidence and take top matches up to max_students
                student_matches.sort(key=lambda x: x['confidence'], reverse=True)
                student_matches = student_matches[:self.max_students]
                
                # Process the best matches
                for match in student_matches:
                    student_id = match['student_id']
                    top, right, bottom, left = match['face_location']
                    face_encoding = match['face_encoding']
                    
                    # Skip suspicious faces for unknown students
                    if (student_id not in self.attendance_marked and 
                        not self.check_face_movement(student_id, (top, right, bottom, left))):
                        continue
                        
                    # Convert detection bbox to tracker format: (x, y, w, h)
                    x, y, w, h = left, top, right - left, bottom - top
                    bbox = (x, y, w, h)
                    
                    if student_id not in self.face_states:
                        tracker, tracker_type = self.create_tracker(frame, bbox)
                        
                        # If attendance already marked, start in "Present" state
                        if student_id in self.attendance_marked:
                            time_offset = self.TRANSITION_PRESENT + 0.1  # Ensure it's past the transition
                        else:
                            time_offset = 0 # Start from detection phase
                        
                        self.face_states[student_id] = {
                            'start_time': current_time - time_offset,  # Adjust time based on attendance status
                            'last_seen': current_time,
                            'attendance_marked': student_id in self.attendance_marked,
                            'tracker': tracker,
                            'tracker_type': tracker_type,
                            'tracker_bbox': (top, right, bottom, left),
                            'confidence': match['confidence']
                        }
                    else:
                        # Reinitialize the tracker with new detection data
                        tracker, tracker_type = self.create_tracker(frame, bbox)
                        self.face_states[student_id]['tracker'] = tracker
                        self.face_states[student_id]['tracker_type'] = tracker_type
                        self.face_states[student_id]['tracker_bbox'] = (top, right, bottom, left)
                        self.face_states[student_id]['confidence'] = match['confidence']
                    
                    state = self.face_states[student_id]
                    elapsed = current_time - state['start_time']
                    
                    # Mark attendance if sufficient time has passed and not already marked
                    if (elapsed >= self.TRANSITION_PRESENT and not state['attendance_marked']):
                        self.mark_attendance(student_id, current_time)
                        state['attendance_marked'] = True

            # Display every frame for full HD experience
            if self.frame_count % display_every_n == 0:
                # -----------------------------
                # 3. Draw stable bounding boxes for tracked faces
                # -----------------------------
                # Use the original frame directly for display
                
                # Draw zoom regions first (so they appear behind face boxes)
                if self.show_zoom_regions and self.enable_auto_zoom:
                    for (top, right, bottom, left) in self.current_zoom_regions:
                        # Draw zoom region with dashed lines
                        dash_length = 10
                        color = (0, 0, 255)  # Red for zoom regions
                        
                        # Draw dashed lines for top and bottom
                        for x in range(left, right, dash_length*2):
                            x_end = min(x + dash_length, right)
                            cv2.line(frame, (x, top), (x_end, top), color, 2)
                            cv2.line(frame, (x, bottom), (x_end, bottom), color, 2)
                            
                        # Draw dashed lines for left and right
                        for y in range(top, bottom, dash_length*2):
                            y_end = min(y + dash_length, bottom)
                            cv2.line(frame, (left, y), (left, y_end), color, 2)
                            cv2.line(frame, (right, y), (right, y_end), color, 2)
                            
                        # Add "ZOOM" label
                        cv2.putText(frame, "ZOOM", (left + 5, top + 20), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                for student_id, state in self.face_states.items():
                    if 'tracker_bbox' in state and (current_time - state['last_seen'] < self.STATE_TIMEOUT):
                        top, right, bottom, left = state['tracker_bbox']
                        elapsed = current_time - state['start_time']
                        confidence = state.get('confidence', 0.0)
                        
                        # Simplified states
                        if elapsed < self.TRANSITION_DETECTING:
                            label = "Detecting..."
                            color = (0, 128, 255)  # Orange
                        elif elapsed < self.TRANSITION_PRESENT:
                            display_name = self.student_id_to_name.get(student_id, str(student_id))
                            label = f"Detected - {display_name}"
                            color = (0, 255, 255)  # Yellow
                        else:
                            display_name = self.student_id_to_name.get(student_id, str(student_id))
                            label = f"{display_name} - Present"
                            color = (0, 255, 0)    # Green
                            
                        # Add confidence display
                        conf_label = f"{confidence:.2f}"
                        
                        cv2.rectangle(frame, (left, top), (right, bottom), color, 3)
                        cv2.putText(frame, label, (left, top - 15),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                        cv2.putText(frame, conf_label, (left, bottom + 15),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1)

                # Show number of tracked students
                students_count = len(self.face_states)
                cv2.putText(frame, f"Students: {students_count}/{self.max_students}", (10, 60), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                            
                # Display registered face count
                registered_count = len(self.registered_faces)
                cv2.putText(frame, f"Registered: {registered_count}", (10, 150), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Calculate and show FPS
                end_time = time.time()
                processing_time = end_time - start_time
                frame_time += processing_time
                frames_processed += 1
                fps_update_counter += 1
                
                # Calculate simple FPS for this frame
                instantaneous_fps = 1.0 / processing_time if processing_time > 0 else 0
                
                # Update average FPS less frequently for more stable display
                if fps_update_counter >= 30:
                    avg_fps = frames_processed / frame_time
                    fps_update_counter = 0
                    
                # Display a weighted average for smoother FPS display
                display_fps = 0.3 * instantaneous_fps + 0.7 * avg_fps if avg_fps > 0 else instantaneous_fps
                    
                cv2.putText(frame, f"FPS: {display_fps:.1f}", (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Add auto-zoom indicator with more visibility
                if self.enable_auto_zoom:
                    cv2.putText(frame, "Auto-Zoom: ON", (10, 90), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)  # Red for visibility
                    # Add zoom count
                    cv2.putText(frame, f"Zoom Regions: {len(self.current_zoom_regions)}", (10, 120), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                else:
                    cv2.putText(frame, "Auto-Zoom: OFF", (10, 90), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 128, 255), 2)

                # Show full HD resolution
                cv2.imshow(window_title, frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            # Toggle auto-zoom with 'z' key
            if key == ord('z'):
                self.enable_auto_zoom = not self.enable_auto_zoom
                logging.info(f"Auto-zoom: {'ON' if self.enable_auto_zoom else 'OFF'}")
                
            # Exit with 'q' key
            if key == ord('q'):
                break

            self.frame_count += 1

        self.camera.release()
        cv2.destroyAllWindows()

def main():
    args = parse_args()
    
    attendance_system = AttendanceSystem(
        db_file=args.external_db,           # Use database from args
        detection_scale=0.25,               # Aggressive downscaling for HD processing
        detection_model="hog",              # Faster face detection model
        face_match_threshold=0.6,           # Keep threshold for matching
        STATE_TIMEOUT=1.0,                  # Quick tracker removal for non-visible faces
        enable_liveness_detection=False,    # Disable for better performance
        process_every_n_frames=8,           # Process every 8th frame for HD smoothness
        face_verification_frequency=15,     # Check face presence less often with HD
        max_students=30,                    # Support up to 30 students
        verbose_logging=False,              # Disable detailed logging for better performance
        enable_auto_zoom=True,              # Enable automatic zooming for distant faces
        min_face_size_for_zoom=100,         # Increased threshold - zoom in on larger faces
        zoom_factor=3.0,                    # Increased zoom factor for more visible zoom
        show_zoom_regions=True,             # Show zoom regions visually
        attendance_id=args.attendance_id,   # Attendance ID for web integration
        result_file=args.result_file        # File to save results
    )
    attendance_system.run()

if __name__ == "__main__":
    main()
