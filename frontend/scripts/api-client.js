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

  async function requestBlob(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      const message = payload?.error || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return response.blob();
  }

  const apiClient = {
    requestJson,
    requestBlob,

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

    generateWorkoutPdf(profile, result) {
      return requestBlob("/api/workout-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile, result }),
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
