(() => {
  "use strict";

  const ADMIN_PIN = "1234";
  const STORAGE_KEY = "royaltyProjects";
  const HIDDEN_DEFAULTS_KEY = "royaltyHiddenDefaultProjects";
  const UNLOCK_KEY = "royaltyAdminUnlocked";
  const MAX_IMAGE_SIZE = 1280;
  const JPEG_QUALITY = 0.84;

  const DEFAULT_PROJECTS = [
    {
      id: "interior-sample",
      mode: "compare",
      title: "Residential Satin Finish",
      type: "Residential Interior",
      notes: "Sample transformation with a smooth satin interior finish.",
      before: "assets/img/web/before-interior.jpg",
      after: "assets/img/web/interior-finish.jpg"
    },
    {
      id: "exterior-sample",
      mode: "compare",
      title: "Exterior Weather Protection",
      type: "Exterior Painting",
      notes: "Sample exterior repaint with fresh colour and weather protection.",
      before: "assets/img/web/before-exterior.jpg",
      after: "assets/img/web/exterior-finish.jpg"
    },
    {
      id: "premium-interior-sample",
      mode: "single",
      title: "Premium Interior Walls",
      type: "Residential Interior",
      notes: "Interior paint project gallery picture.",
      image: "assets/img/web/interior-finish.jpg"
    },
    {
      id: "exterior-facade-sample",
      mode: "single",
      title: "Exterior Facade Refresh",
      type: "Exterior Painting",
      notes: "Exterior paint project gallery picture.",
      image: "assets/img/web/exterior-finish.jpg"
    },
    {
      id: "wood-gloss-sample",
      mode: "single",
      title: "Wood & Gloss Details",
      type: "Wood & Gloss Finish",
      notes: "Wood and gloss finish project gallery picture.",
      image: "assets/img/web/wood-gloss-sample.jpg"
    }
  ];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  let selectedUploadIds = new Set();
  let selectedDefaultIds = new Set();

  function getProjects() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Bad project data", error);
      return [];
    }
  }

  function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function getHiddenDefaults() {
    try {
      const data = JSON.parse(localStorage.getItem(HIDDEN_DEFAULTS_KEY) || "[]");
      return new Set(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Bad default visibility data", error);
      return new Set();
    }
  }

  function saveHiddenDefaults(hiddenSet) {
    localStorage.setItem(HIDDEN_DEFAULTS_KEY, JSON.stringify([...hiddenSet]));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showStatus(message, type = "success") {
    const status = $("#adminStatus");
    if (!status) return;
    status.className = `alert alert-${type} rounded-4 mt-3`;
    status.textContent = message;
    status.classList.remove("d-none");
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => status.classList.add("d-none"), 4400);
  }

  function showDashboard() {
    $("#adminLoginArea")?.classList.add("d-none");
    $("#adminDashboard")?.classList.remove("d-none");
    renderDefaultProjects();
    renderAdminProjects();
  }

  function showLogin() {
    $("#adminLoginArea")?.classList.remove("d-none");
    $("#adminDashboard")?.classList.add("d-none");
  }

  function initLogin() {
    if (localStorage.getItem(UNLOCK_KEY) === "yes") showDashboard();
    else showLogin();

    $("#adminLoginForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const pin = new FormData(event.currentTarget).get("pin");
      if (pin === ADMIN_PIN) {
        localStorage.setItem(UNLOCK_KEY, "yes");
        showDashboard();
      } else {
        showStatus("Incorrect PIN.", "danger");
      }
    });

    $("#logoutAdmin")?.addEventListener("click", () => {
      localStorage.removeItem(UNLOCK_KEY);
      showLogin();
    });
  }

  function fileToCompressedDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Please select an image."));
        return;
      }
      if (!file.type.startsWith("image/")) {
        reject(new Error("Only image files are supported."));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Could not load image."));
        image.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
          const width = Math.round(image.width * scale);
          const height = Math.round(image.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function syncGalleryModeFields() {
    const mode = $("#galleryMode")?.value || "single";
    $$('[data-single-upload]').forEach((el) => el.classList.toggle("d-none", mode !== "single"));
    $$('[data-compare-upload]').forEach((el) => el.classList.toggle("d-none", mode !== "compare"));
  }

  async function handleAddProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const mode = String(formData.get("mode") || "single");
    const title = String(formData.get("title") || "").trim();
    const type = String(formData.get("type") || "Paint Project").trim();
    const notes = String(formData.get("notes") || "").trim();
    const mainFile = $("#mainImage")?.files?.[0];
    const beforeFile = $("#beforeImage")?.files?.[0];
    const afterFile = $("#afterImage")?.files?.[0];

    if (!title) {
      showStatus("Add a project title.", "warning");
      return;
    }
    if (mode === "single" && !mainFile) {
      showStatus("Add a project picture.", "warning");
      return;
    }
    if (mode === "compare" && (!beforeFile || !afterFile)) {
      showStatus("Add both before and after pictures.", "warning");
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    const originalText = submitButton?.textContent;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Processing pictures...";
    }

    try {
      const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `project-${Date.now()}`;
      const baseItem = {
        id,
        mode,
        title,
        type,
        notes,
        date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
        createdAt: new Date().toISOString()
      };

      let item;
      if (mode === "single") {
        item = {
          ...baseItem,
          image: await fileToCompressedDataURL(mainFile)
        };
      } else {
        const [before, after] = await Promise.all([
          fileToCompressedDataURL(beforeFile),
          fileToCompressedDataURL(afterFile)
        ]);
        item = {
          ...baseItem,
          before,
          after
        };
      }

      const projects = getProjects();
      projects.unshift(item);
      selectedUploadIds = new Set([id]);
      saveProjects(projects);
      form.reset();
      syncGalleryModeFields();
      renderAdminProjects();
      showStatus("Gallery item added.");
    } catch (error) {
      showStatus(error.message || "Could not add gallery item.", "danger");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  }

  function itemThumbHtml(item) {
    if (item.image || item.mode === "single") {
      return `<img class="admin-single-preview" src="${item.image || item.after || item.before}" alt="${escapeHtml(item.title)}">`;
    }
    return `
      <div class="row g-2">
        <div class="col-6"><img src="${item.before}" alt="Before ${escapeHtml(item.title)}"></div>
        <div class="col-6"><img src="${item.after}" alt="After ${escapeHtml(item.title)}"></div>
      </div>`;
  }

  function renderDefaultProjects() {
    const list = $("#defaultProjectList");
    if (!list) return;
    const hidden = getHiddenDefaults();
    list.innerHTML = DEFAULT_PROJECTS.map((project, index) => {
      const isHidden = hidden.has(project.id);
      const isSelected = selectedDefaultIds.has(project.id);
      return `
        <article class="admin-item ${isSelected ? "is-selected" : ""} ${isHidden ? "is-hidden-default" : ""}">
          <label class="admin-check">
            <input type="checkbox" value="${escapeHtml(project.id)}" data-default-check ${isSelected ? "checked" : ""}>
            <span><span class="admin-order-badge">${index + 1}</span>${escapeHtml(project.title)}</span>
          </label>
          ${itemThumbHtml(project)}
          <h4>${escapeHtml(project.title)}</h4>
          <p><strong>${escapeHtml(project.type || "Gallery Picture")}</strong></p>
          <p>${escapeHtml(project.notes || "Project gallery picture.")}</p>
          <span class="default-status ${isHidden ? "hidden" : ""}">${isHidden ? "Hidden from gallery" : "Visible in gallery"}</span>
        </article>`;
    }).join("");

    $$('[data-default-check]', list).forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedDefaultIds.add(checkbox.value);
        else selectedDefaultIds.delete(checkbox.value);
        renderDefaultProjects();
      });
    });

    const selectAll = $("#selectAllDefaultProjects");
    if (selectAll) {
      selectAll.checked = DEFAULT_PROJECTS.length > 0 && DEFAULT_PROJECTS.every((item) => selectedDefaultIds.has(item.id));
      selectAll.indeterminate = selectedDefaultIds.size > 0 && !selectAll.checked;
    }
  }

  function renderAdminProjects() {
    const list = $("#adminProjectList");
    const count = $("#projectCount");
    if (!list) return;
    const projects = getProjects();
    selectedUploadIds = new Set([...selectedUploadIds].filter((id) => projects.some((project) => project.id === id)));
    if (count) count.textContent = projects.length;

    const selectAll = $("#selectAllProjects");
    if (selectAll) {
      selectAll.checked = projects.length > 0 && projects.every((project) => selectedUploadIds.has(project.id));
      selectAll.indeterminate = selectedUploadIds.size > 0 && !selectAll.checked;
    }

    if (!projects.length) {
      list.innerHTML = `
        <div class="glass-card p-4 text-center">
          <h3 class="text-royal fw-bold">No uploaded gallery items yet</h3>
          <p class="section-copy mb-0">Add the first project picture with the form.</p>
        </div>`;
      return;
    }

    list.innerHTML = projects.map((project, index) => {
      const isSelected = selectedUploadIds.has(project.id);
      const modeLabel = project.image || project.mode === "single" ? "Single Photo" : "Before/After";
      return `
        <article class="admin-item ${isSelected ? "is-selected" : ""}">
          <label class="admin-check">
            <input type="checkbox" value="${escapeHtml(project.id)}" data-project-check ${isSelected ? "checked" : ""}>
            <span><span class="admin-order-badge">${index + 1}</span>${escapeHtml(project.title)}</span>
          </label>
          ${itemThumbHtml(project)}
          <h4>${escapeHtml(project.title)}</h4>
          <p><strong>${escapeHtml(project.type || "Project")}</strong> · ${escapeHtml(modeLabel)} · ${escapeHtml(project.date || "")}</p>
          <p>${escapeHtml(project.notes || "No note added.")}</p>
        </article>`;
    }).join("");

    $$('[data-project-check]', list).forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedUploadIds.add(checkbox.value);
        else selectedUploadIds.delete(checkbox.value);
        renderAdminProjects();
      });
    });
  }

  function deleteSelectedProjects() {
    const ids = [...selectedUploadIds];
    if (!ids.length) {
      showStatus("Select at least one uploaded project first.", "warning");
      return;
    }
    if (!confirm(`Delete ${ids.length} selected uploaded project(s)?`)) return;
    const idSet = new Set(ids);
    saveProjects(getProjects().filter((project) => !idSet.has(project.id)));
    selectedUploadIds.clear();
    renderAdminProjects();
    showStatus("Selected project(s) deleted.", "info");
  }

  function moveSelectedProjects(direction) {
    if (!selectedUploadIds.size) {
      showStatus("Select uploaded project(s) to reorder first.", "warning");
      return;
    }
    const projects = getProjects();
    if (direction === "up") {
      for (let i = 1; i < projects.length; i += 1) {
        if (selectedUploadIds.has(projects[i].id) && !selectedUploadIds.has(projects[i - 1].id)) {
          [projects[i - 1], projects[i]] = [projects[i], projects[i - 1]];
        }
      }
    } else {
      for (let i = projects.length - 2; i >= 0; i -= 1) {
        if (selectedUploadIds.has(projects[i].id) && !selectedUploadIds.has(projects[i + 1].id)) {
          [projects[i + 1], projects[i]] = [projects[i], projects[i + 1]];
        }
      }
    }
    saveProjects(projects);
    renderAdminProjects();
    showStatus(`Selected project(s) moved ${direction}.`, "info");
  }

  function hideSelectedDefaults() {
    if (!selectedDefaultIds.size) {
      showStatus("Select at least one default gallery item first.", "warning");
      return;
    }
    const hidden = getHiddenDefaults();
    selectedDefaultIds.forEach((id) => hidden.add(id));
    saveHiddenDefaults(hidden);
    renderDefaultProjects();
    showStatus("Selected default gallery item(s) hidden.", "info");
  }

  function restoreSelectedDefaults() {
    if (!selectedDefaultIds.size) {
      showStatus("Select at least one default gallery item first.", "warning");
      return;
    }
    const hidden = getHiddenDefaults();
    selectedDefaultIds.forEach((id) => hidden.delete(id));
    saveHiddenDefaults(hidden);
    renderDefaultProjects();
    showStatus("Selected default gallery item(s) restored.");
  }

  function restoreAllDefaults() {
    saveHiddenDefaults(new Set());
    selectedDefaultIds.clear();
    renderDefaultProjects();
    showStatus("All default gallery items restored.");
  }

  function initTools() {
    syncGalleryModeFields();
    $("#galleryMode")?.addEventListener("change", syncGalleryModeFields);
    $("#adminProjectForm")?.addEventListener("submit", handleAddProject);

    $("#selectAllProjects")?.addEventListener("change", (event) => {
      const projects = getProjects();
      selectedUploadIds = event.currentTarget.checked ? new Set(projects.map((project) => project.id)) : new Set();
      renderAdminProjects();
    });

    $("#deleteSelectedProjects")?.addEventListener("click", deleteSelectedProjects);
    $("#moveSelectedProjectsUp")?.addEventListener("click", () => moveSelectedProjects("up"));
    $("#moveSelectedProjectsDown")?.addEventListener("click", () => moveSelectedProjects("down"));

    $("#selectAllDefaultProjects")?.addEventListener("change", (event) => {
      selectedDefaultIds = event.currentTarget.checked ? new Set(DEFAULT_PROJECTS.map((project) => project.id)) : new Set();
      renderDefaultProjects();
    });

    $("#hideSelectedDefaults")?.addEventListener("click", hideSelectedDefaults);
    $("#restoreSelectedDefaults")?.addEventListener("click", restoreSelectedDefaults);
    $("#restoreAllDefaults")?.addEventListener("click", restoreAllDefaults);

    $("#exportProjects")?.addEventListener("click", () => {
      const payload = {
        uploadedProjects: getProjects(),
        hiddenDefaultProjects: [...getHiddenDefaults()],
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `royalty-paints-gallery-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      showStatus("Gallery backup downloaded.");
    });

    $("#importProjects")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const projectSource = Array.isArray(data) ? data : data.uploadedProjects;
          if (!Array.isArray(projectSource)) throw new Error("Backup must include uploaded projects.");
          const cleaned = projectSource.filter((item) => item && (item.image || (item.before && item.after))).map((item) => ({
            id: item.id || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `project-${Date.now()}-${Math.random().toString(16).slice(2)}`),
            mode: item.image || item.mode === "single" ? "single" : "compare",
            title: item.title || "Imported project",
            type: item.type || "Paint Project",
            notes: item.notes || item.description || "Imported gallery item.",
            image: item.image || "",
            before: item.before || "",
            after: item.after || "",
            date: item.date || "Imported",
            createdAt: item.createdAt || item.date || new Date().toISOString()
          }));
          saveProjects(cleaned);
          if (Array.isArray(data.hiddenDefaultProjects)) saveHiddenDefaults(new Set(data.hiddenDefaultProjects));
          selectedUploadIds.clear();
          selectedDefaultIds.clear();
          renderAdminProjects();
          renderDefaultProjects();
          showStatus("Gallery backup imported.");
        } catch (error) {
          showStatus("Could not import backup. Please select a valid export JSON file.", "danger");
        } finally {
          event.target.value = "";
        }
      };
      reader.readAsText(file);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLogin();
    initTools();
  });
})();
