(function initApiClient(globalScope) {
  function buildJsonHeaders(customHeaders) {
    return {
      "Content-Type": "application/json",
      ...(customHeaders || {}),
    };
  }

  function createTimeoutController(timeoutMs) {
    if (!(timeoutMs > 0)) {
      return { controller: null, timeoutHandle: null };
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return { controller, timeoutHandle };
  }

  function clearTimeoutController(timeoutHandle) {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }

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
    const { timeoutMs = 0, ...fetchOptions } = options;
    const { controller, timeoutHandle } = createTimeoutController(timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: buildJsonHeaders(fetchOptions.headers),
        signal: controller?.signal,
      });

      return parseJsonResponse(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("A solicitação demorou demais para responder. Tente novamente.");
      }

      throw error;
    } finally {
      clearTimeoutController(timeoutHandle);
    }
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
        timeoutMs: 65000,
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
