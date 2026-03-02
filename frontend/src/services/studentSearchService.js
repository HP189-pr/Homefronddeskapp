import API from '../api/axiosInstance';

/**
 * Student Search Service
 * Handles API calls for comprehensive student information search
 */

/**
 * Search student by enrollment number
 * @param {string} enrollmentNo - Enrollment number to search
 * @returns {Promise} Student data object with general, services, and fees information
 */
export const searchStudent = async (enrollmentNo) => {
    try {
        const response = await API.get('/api/student-search/search/', {
            params: { enrollment: enrollmentNo.trim() }
        });
        return response.data;
    } catch (error) {
        const message = error?.response?.data?.error
            || error?.response?.data?.message
            || error?.message
            || 'Student search failed';
        throw new Error(message);
    }
};

/**
 * Format date for display (YYYY-MM-DD to DD-MM-YYYY)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    } catch {
        return dateString;
    }
};

/**
 * Get status badge color
 * @param {string} status - Status value
 * @returns {string} Tailwind color class
 */
export const getStatusColor = (status) => {
    const colors = {
        'DONE': 'emerald',
        'IN_PROGRESS': 'blue',
        'PENDING': 'orange',
        'CORRECTION': 'yellow',
        'CANCEL': 'rose',
    };
    return colors[status] || 'slate';
};

export default {
    searchStudent,
    formatDate,
    getStatusColor,
};
