/**
 * Fee Type master service helpers
 */
import axiosInstance from '../components/api/axiosInstance.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_BASE_URL}/fee-types/`;

export const fetchFeeTypes = async (params = {}) => {
  const response = await axiosInstance.get(BASE_URL, { params });
  return response.data;
};

export const createFeeType = async (payload) => {
  const response = await axiosInstance.post(BASE_URL, payload);
  return response.data;
};

export const updateFeeType = async (id, payload) => {
  const response = await axiosInstance.put(`${BASE_URL}${id}/`, payload);
  return response.data;
};

export default {
  fetchFeeTypes,
  createFeeType,
  updateFeeType,
};