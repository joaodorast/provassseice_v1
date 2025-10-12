import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-83358821`;

class ApiService {
  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || publicAnonKey}`,
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds for better reliability
    
    try {
      console.log(`API Request starting: ${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`API Response received: ${endpoint} - Status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
        
        console.error(`API Error: ${endpoint} - ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      console.log(`API Success: ${endpoint}`);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error(`API Timeout: ${endpoint}`);
        return { success: false, error: 'Timeout: A requisição demorou muito para responder' };
      }
      
      if (error.message?.includes('Failed to fetch')) {
        console.error(`API Network Error: ${endpoint}`);
        return { success: false, error: 'Erro de conexão. Verifique sua internet.' };
      }
      
      console.error(`API request failed for ${endpoint}:`, error);
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  }

  // Students API
  async getStudents() {
    return this.request('/students');
  }

  async createStudents(students: any[]) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify({ students }),
    });
  }

  async updateStudent(id: string, data: any) {
    return this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: string) {
    return this.request(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Questions API
  async getQuestions() {
    const token = localStorage.getItem('access_token');
    console.log('getQuestions - Auth token present:', !!token);
    return this.request('/questions');
  }

  async createQuestion(question: any) {
    const token = localStorage.getItem('access_token');
    console.log('createQuestion - Auth token present:', !!token);
    console.log('createQuestion - Question data:', {
      hasQuestion: !!question.question,
      hasSubject: !!question.subject,
      hasDifficulty: !!question.difficulty,
      optionsCount: question.options?.length
    });
    return this.request('/questions', {
      method: 'POST',
      body: JSON.stringify(question),
    });
  }

  async updateQuestion(id: string, data: any) {
    return this.request(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuestion(id: string) {
    return this.request(`/questions/${id}`, {
      method: 'DELETE',
    });
  }

  // Exams API
  async getExams() {
    return this.request('/exams');
  }

  async createExam(exam: any) {
    return this.request('/exams', {
      method: 'POST',
      body: JSON.stringify(exam),
    });
  }

  async updateExam(id: string, data: any) {
    return this.request(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExam(id: string) {
    return this.request(`/exams/${id}`, {
      method: 'DELETE',
    });
  }

  // Submissions API
  async getSubmissions() {
    return this.request('/submissions');
  }

  async createSubmission(submission: any) {
    return this.request('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  // Images API
  async getImages() {
    return this.request('/images');
  }

  async uploadImage(imageData: any) {
    return this.request('/images', {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
  }

  async updateImageStatus(imageId: string, statusData: any) {
    return this.request(`/images/${imageId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async deleteImage(imageId: string) {
    return this.request(`/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  // Classes API
  async getClasses() {
    return this.request('/classes');
  }

  async createClass(classData: any) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  }

  async updateClass(id: string, data: any) {
    return this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClass(id: string) {
    return this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard API
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Applications API
  async getApplications() {
    return this.request('/applications');
  }

  async createApplication(applicationData: any) {
    return this.request('/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async updateApplication(id: string, data: any) {
    return this.request(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApplication(id: string) {
    return this.request(`/applications/${id}`, {
      method: 'DELETE',
    });
  }

  // Public exam access (no auth required)
  async getPublicExam(examId: string, sessionId: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    try {
      const response = await fetch(`${API_BASE_URL}/public/exam/${examId}?session=${sessionId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return { success: false, error: 'Timeout: A requisição demorou muito para responder' };
      }
      
      console.error('Public exam request failed:', error);
      return { success: false, error: error.message || 'Erro ao carregar exame' };
    }
  }

  // Grading and Review API
  async updateSubmissionReview(id: string, reviewData: any) {
    return this.request(`/submissions/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async bulkExportSubmissions(submissionIds: string[], format = 'csv') {
    return this.request('/submissions/bulk-export', {
      method: 'POST',
      body: JSON.stringify({ submissionIds, format }),
    });
  }

  async getGradingStats() {
    return this.request('/analytics/grading-stats');
  }

  // Reports API
  async generateReport(reportId: string, options: any = {}) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ reportId, options }),
    });
  }

  async getReportStatus(reportId: string) {
    return this.request(`/reports/status/${reportId}`);
  }

  async downloadReport(reportId: string, format: string) {
    return this.request(`/reports/download/${reportId}?format=${format}`);
  }

  async getAvailableReports() {
    return this.request('/reports/available');
  }

  // Series Management API
  async getSeries() {
    return this.request('/series');
  }

  async createSerie(serieData: any) {
    return this.request('/series', {
      method: 'POST',
      body: JSON.stringify(serieData),
    });
  }

  async updateSerie(serieId: string, updateData: any) {
    return this.request(`/series/${serieId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteSerie(serieId: string) {
    return this.request(`/series/${serieId}`, {
      method: 'DELETE',
    });
  }

  async getSerieById(serieId: string) {
    return this.request(`/series/${serieId}`);
  }

  async getSerieStudents(serieId: string) {
    return this.request(`/series/${serieId}/students`);
  }

  // Exam Management API (Extended)
  async duplicateExam(examId: string) {
    return this.request(`/exams/${examId}/duplicate`, {
      method: 'POST',
    });
  }

  async updateExamStatus(examId: string, status: string) {
    return this.request(`/exams/${examId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async exportExams(examIds: string[] = [], format = 'json') {
    return this.request('/exams/export', {
      method: 'POST',
      body: JSON.stringify({ examIds, format }),
    });
  }

  async importExams(data: any, overwrite = false) {
    return this.request('/exams/import', {
      method: 'POST',
      body: JSON.stringify({ data, overwrite }),
    });
  }

  async getExamStats(examId: string) {
    return this.request(`/exams/${examId}/stats`);
  }

  // Grading & Correction API (Extended)
  async uploadAnswerSheet(submissionId: string, imageData: string, fileName: string, studentName?: string, examId?: string) {
    return this.request(`/submissions/${submissionId}/upload-answer-sheet`, {
      method: 'POST',
      body: JSON.stringify({ imageData, fileName, studentName, examId }),
    });
  }

  async getAnswerSheets(submissionId: string) {
    return this.request(`/submissions/${submissionId}/answer-sheets`);
  }

  async deleteAnswerSheet(imageId: string) {
    return this.request(`/answer-sheets/${imageId}`, {
      method: 'DELETE',
    });
  }

  async getAllAnswerSheets() {
    return this.request('/answer-sheets');
  }

  async updateManualGrade(submissionId: string, gradeData: any) {
    return this.request(`/submissions/${submissionId}/manual-grade`, {
      method: 'PUT',
      body: JSON.stringify(gradeData),
    });
  }

  async bulkUpdateSubmissions(updates: any[]) {
    return this.request('/submissions/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  }

  async exportGradingReport(options: { submissionIds?: string[], examId?: string, format?: string }) {
    return this.request('/grading/export-report', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getGradingQueue() {
    return this.request('/grading/queue');
  }

  // Dashboard Stats
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Health check
  async checkHealth() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();