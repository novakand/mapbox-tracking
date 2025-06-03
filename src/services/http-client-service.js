export class HttpClientService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async get(url, options = {}) {
    try {
      const response = await fetch(this.baseUrl + url, {
        method: 'GET',
        ...options,
      });
      return await this.handleResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async post(url, data = {}, options = {}) {
    try {
      const response = await fetch(this.baseUrl + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        ...options,
      });
      return await this.handleResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async put(url, data = {}, options = {}) {
    try {
      const response = await fetch(this.baseUrl + url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        ...options,
      });
      return await this.handleResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(url, options = {}) {
    try {
      const response = await fetch(this.baseUrl + url, {
        method: 'DELETE',
        ...options,
      });
      return await this.handleResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Unknown error');
    }
    return response.json();
  }

  handleError(error) {
    console.error('[HttpService]', error);
    throw error;
  }
}
