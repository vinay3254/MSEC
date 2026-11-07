import api from './api';
import { User } from '../types';

export const studentService = {
  async getStudents(params?: { search?: string; department?: string; year?: number }): Promise<User[]> {
    const response = await api.get<User[]>('/students', { params });
    return response.data;
  },

  async getStudent(studentId: number): Promise<User> {
    const response = await api.get<User>(`/students/${studentId}`);
    return response.data;
  },

  async registerStudent(data: Partial<User> & { password?: string }): Promise<User> {
    const response = await api.post<User>('/students', {
      ...data,
      password: data.password || 'Student@123',
    });
    return response.data;
  },

  async updateStudent(studentId: number, data: Partial<User>): Promise<User> {
    const response = await api.patch<User>(`/students/${studentId}`, data);
    return response.data;
  },
};
