export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export const validateEnrollmentId = (id: string): boolean => {
  return id.length >= 3 && /^[a-zA-Z0-9\-]+$/.test(id);
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional
  const re = /^[\d\s\-\(\)\+]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validateClassCode = (code: string): boolean => {
  return code.length >= 1 && /^[a-zA-Z0-9\-_]+$/.test(code);
};

export const getErrorMessage = (field: string, error: string): string => {
  const messages: Record<string, Record<string, string>> = {
    email: {
      invalid: 'Please enter a valid email address',
      required: 'Email is required',
    },
    password: {
      invalid: 'Password must be at least 8 characters',
      required: 'Password is required',
    },
    enrollmentId: {
      invalid: 'Enrollment ID must be 3+ alphanumeric characters',
      required: 'Enrollment ID is required',
    },
    phone: {
      invalid: 'Please enter a valid phone number',
      required: 'Phone number is required',
    },
  };

  return messages[field]?.[error] || `${field} is invalid`;
};
