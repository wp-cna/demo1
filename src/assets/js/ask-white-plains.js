(function () {
  const form = document.querySelector("[data-ask-form]");

  if (!form) {
    return;
  }

  const questionField = form.querySelector("[data-ask-question]");
  const submitButton = form.querySelector("[data-ask-submit]");
  const status = form.querySelector("[data-ask-status]");
  const error = form.querySelector("[data-ask-error]");
  const config = form.querySelector("[data-ask-config]");
  const results = document.querySelector("[data-ask-results]");
  const answer = document.querySelector("[data-ask-answer]");
  const sourcesWrap = document.querySelector("[data-ask-sources-wrap]");
  const sourcesList = document.querySelector("[data-ask-sources]");
  const starters = Array.from(document.querySelectorAll("[data-ask-starter]"));
  const apiUrl = String(form.dataset.apiUrl || "").trim();
  const sitePrefix = String(form.dataset.sitePrefix || "/").trim() || "/";

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const withPrefix = (url) => {
    if (!url || url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    const cleanPrefix = sitePrefix === "/" ? "" : sitePrefix.replace(/\/$/, "");
    const cleanPath = url === "/" ? "/" : `/${String(url).replace(/^\/+/, "")}`;

    if (!cleanPrefix) {
      return cleanPath;
    }

    return cleanPath === "/" ? `${cleanPrefix}/` : `${cleanPrefix}${cleanPath}`;
  };

  const setStatus = (message) => {
    status.textContent = message || "";
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = "";
  };

  const setError = (message) => {
    error.hidden = !message;
    error.textContent = message || "";
  };

  const renderAnswer = (text) => {
    const paragraphs = String(text || "")
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    answer.innerHTML = paragraphs.length
      ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
      : "<p>I do not have enough information from the current WPCNA sources.</p>";
  };

  const renderSources = (sources) => {
    const items = Array.isArray(sources) ? sources.filter(Boolean) : [];

    if (!items.length) {
      sourcesWrap.hidden = true;
      sourcesList.innerHTML = "";
      return;
    }

    sourcesList.innerHTML = items
      .map((source) => {
        const title = escapeHtml(source.title || source.url || "Source");
        const url = escapeHtml(withPrefix(source.url || "#"));
        const type = escapeHtml(source.type || "Source");
        return `<li><a href="${url}">${title}</a><span>${type}</span></li>`;
      })
      .join("");

    sourcesWrap.hidden = false;
  };

  const setBusy = (isBusy) => {
    submitButton.disabled = isBusy;
    questionField.disabled = isBusy;
    starters.forEach((button) => {
      button.disabled = isBusy;
    });
  };

  const runAsk = async (question) => {
    const trimmed = String(question || "").trim();

    clearError();
    setStatus("");

    if (!trimmed) {
      setError("Enter a question before submitting.");
      questionField.focus();
      return;
    }

    if (!apiUrl) {
      config.hidden = false;
      setError("This feature is not configured yet.");
      return;
    }

    config.hidden = true;
    setBusy(true);
    setStatus("Looking through current WPCNA sources...");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: trimmed })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "The assistant could not answer right now.");
      }

      renderAnswer(payload.answer);
      renderSources(payload.sources);
      results.hidden = false;
      setStatus("Answer ready.");
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err && err.message ? err.message : "Something went wrong. Please try again.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runAsk(questionField.value);
  });

  starters.forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.getAttribute("data-ask-starter") || "";
      questionField.value = prompt;
      questionField.focus();
      runAsk(prompt);
    });
  });

  if (!apiUrl) {
    config.hidden = false;
    setStatus("Backend endpoint not configured yet.");
  }
})();
