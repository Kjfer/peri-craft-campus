// API Configuration for connecting frontend to backend
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3003/api',
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      ME: '/auth/me',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password'
    },
    // Course endpoints
    COURSES: {
      LIST: '/courses',
      DETAIL: '/courses',
      CREATE: '/courses',
      UPDATE: '/courses',
      DELETE: '/courses',
      STATS: '/courses',
      CATEGORIES: '/courses/meta/categories'
    },
    // User endpoints
    USERS: {
      PROFILE: '/users/profile',
      ENROLLMENTS: '/users/enrollments',
      CERTIFICATES: '/users/certificates',
      PROGRESS: '/users/progress',
      PAYMENTS: '/users/payments'
    },
    // Enrollment endpoints
    ENROLLMENTS: {
      CREATE: '/enrollments',
      LIST: '/enrollments',
      BY_COURSE: '/enrollments/course',
      UPDATE: '/enrollments',
      DELETE: '/enrollments'
    },
    // Certificate endpoints
    CERTIFICATES: {
      VERIFY: '/certificates/verify',
      LIST: '/certificates',
      CREATE: '/certificates',
      UPDATE: '/certificates'
    },
    // Payment endpoints
    PAYMENTS: {
      CREATE_INTENT_COURSE: '/payments/create-intent/course',
      CREATE_INTENT_SUBSCRIPTION: '/payments/create-intent/subscription',
      CONFIRM: '/payments/confirm',
      LIST: '/payments',
      REFUND: '/payments'
    },
    // Subscription endpoints
    SUBSCRIPTIONS: {
      LIST: '/subscriptions',
      DETAIL: '/subscriptions',
      CREATE: '/subscriptions',
      UPDATE: '/subscriptions'
    },
    // Lesson endpoints
    LESSONS: {
      BY_COURSE: '/lessons/course',
      DETAIL: '/lessons',
      CREATE: '/lessons',
      UPDATE: '/lessons',
      PROGRESS: '/lessons'
    },
    // Upload endpoints
    UPLOAD: {
      COURSE_THUMBNAIL: '/upload/course-thumbnail',
      LESSON_VIDEO: '/upload/lesson-video',
      AVATAR: '/upload/avatar',
      MULTIPLE: '/upload/multiple'
    },
    // Admin endpoints
    ADMIN: {
      DASHBOARD: '/admin/dashboard',
      USERS: '/admin/users',
      COURSES: '/admin/courses',
      ANALYTICS: '/admin/analytics'
    }
  }
};

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add authorization header if user is logged in
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    try {
      const tokenData = JSON.parse(token);
      if (tokenData.access_token) {
        defaultOptions.headers = {
          ...defaultOptions.headers,
          'Authorization': `Bearer ${tokenData.access_token}`
        };
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
  }

  const config: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...(defaultOptions.headers as Record<string, string>),
      ...(options.headers as Record<string, string> || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Specific API functions
export const authAPI = {
  register: (userData: any) => apiCall(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  login: (credentials: any) => apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  logout: () => apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
    method: 'POST'
  }),
  
  getProfile: () => apiCall(API_CONFIG.ENDPOINTS.AUTH.ME)
};

export const courseAPI = {
  getAll: (params: Record<string, any> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`${API_CONFIG.ENDPOINTS.COURSES.LIST}?${queryString}`);
  },
  
  getById: (id: string) => apiCall(`${API_CONFIG.ENDPOINTS.COURSES.DETAIL}/${id}`),
  
  create: (courseData: any) => apiCall(API_CONFIG.ENDPOINTS.COURSES.CREATE, {
    method: 'POST',
    body: JSON.stringify(courseData)
  }),
  
  update: (id: string, courseData: any) => apiCall(`${API_CONFIG.ENDPOINTS.COURSES.UPDATE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(courseData)
  }),
  
  getCategories: () => apiCall(API_CONFIG.ENDPOINTS.COURSES.CATEGORIES)
};

export const enrollmentAPI = {
  create: (courseId: string) => apiCall(API_CONFIG.ENDPOINTS.ENROLLMENTS.CREATE, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId })
  }),
  
  getByUser: () => apiCall(API_CONFIG.ENDPOINTS.ENROLLMENTS.LIST),
  
  getByCourse: (courseId: string) => apiCall(`${API_CONFIG.ENDPOINTS.ENROLLMENTS.BY_COURSE}/${courseId}`)
};

export const certificateAPI = {
  verify: (code: string) => apiCall(`${API_CONFIG.ENDPOINTS.CERTIFICATES.VERIFY}/${code}`),
  
  getByUser: () => apiCall(API_CONFIG.ENDPOINTS.CERTIFICATES.LIST),
  
  create: (courseId: string) => apiCall(API_CONFIG.ENDPOINTS.CERTIFICATES.CREATE, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId })
  })
};

export const paymentAPI = {
  createCourseIntent: (courseId: string) => apiCall(API_CONFIG.ENDPOINTS.PAYMENTS.CREATE_INTENT_COURSE, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId })
  }),
  
  confirmPayment: (paymentIntentId: string, paymentId: string) => apiCall(API_CONFIG.ENDPOINTS.PAYMENTS.CONFIRM, {
    method: 'POST',
    body: JSON.stringify({ payment_intent_id: paymentIntentId, payment_id: paymentId })
  })
};
