(function initApiClient(globalScope) {
  async function parseJsonResponse(response) {
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = data?.error || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    return parseJsonResponse(response);
  }

  const apiClient = {
    requestJson,

    login(email, password) {
      return requestJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    register(email, password) {
      return requestJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    logout() {
      return requestJson("/api/auth/logout", {
        method: "POST",
      });
    },

    generateWorkout(payload) {
      return requestJson("/api/generate-workout", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    getDashboard() {
      return requestJson("/api/dashboard");
    },

    getHistory() {
      return requestJson("/api/history");
    },

    syncHistory(entries) {
      return requestJson("/api/history/sync", {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
    },
  };

  globalScope.apiClient = apiClient;
})(window);
