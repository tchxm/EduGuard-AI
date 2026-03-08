from flask_login import UserMixin
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint

# Create db instance without initializing it
db = SQLAlchemy()

class Teacher(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    classes = db.relationship('Class', backref='teacher', lazy=True)
    attendances = db.relationship('Attendance', backref='teacher_attendance', lazy=True)
    
    def __repr__(self):
        return f'<Teacher {self.name}>'

class Class(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(20), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    students = db.relationship('Student', backref='class_enrolled', lazy=True)
    attendances = db.relationship('Attendance', backref='class_attendance', lazy=True)
    
    def __repr__(self):
        return f'<Class {self.name} {self.section}>'

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    face_encoding = db.Column(db.Text, nullable=True)
    image_file = db.Column(db.String(100), nullable=True, default='default.jpg')
    class_id = db.Column(db.Integer, db.ForeignKey('class.id'), nullable=False)
    attendances = db.relationship('AttendanceRecord', backref='student', lazy=True)
    __table_args__ = (
        UniqueConstraint('student_id', 'class_id', name='uq_student_per_class'),
    )
    
    def __repr__(self):
        return f'<Student {self.name}>'

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    class_id = db.Column(db.Integer, db.ForeignKey('class.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    records = db.relationship('AttendanceRecord', backref='attendance', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Attendance {self.date}>'

class AttendanceRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    attendance_id = db.Column(db.Integer, db.ForeignKey('attendance.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    status = db.Column(db.Boolean, default=False)  # True for present, False for absent
    notification_sent = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<AttendanceRecord {self.student_id} - {self.status}>' 