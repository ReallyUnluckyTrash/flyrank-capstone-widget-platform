(() => {
  const script = document.currentScript;
  const scriptUrl = new URL(script.src);
  const widgetId = scriptUrl.searchParams.get("id");
  const apiUrl = scriptUrl.origin;
  const root = document.createElement("div");
  const style = document.createElement("style");

  style.textContent = `
	.flyrank-widget {
		box-sizing: border-box;
		max-width: 640px;
    font-family: 'DM Sans', sans-serif;
	}

	.flyrank-widget__form {
		box-sizing: border-box;
		margin: 0;
    padding: 18px;
    border: 1px solid #e5ebe5;
    border-radius: 5px;
    background: #fff;
    color: #283a2e;
    font: 14px/1.5 'DM Sans', sans-serif;
  }

  .flyrank-widget__brand {
    display: block;
    margin-bottom: 12px;
    color: var(--flyrank-accent, #087d56);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
  }

  .flyrank-widget__title {
    margin: 0 0 5px;
    color: #283a2e;
    font-size: 18px;
    line-height: 1.35;
  }

  .flyrank-widget__description {
    margin: 0 0 15px;
    color: #829087;
    font-size: 13px;
    line-height: 1.5;
	}

	.flyrank-widget__field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 0 0 11px;
    color: #58665c;
    font-size: 12px;
	}

	.flyrank-widget__input {
		box-sizing: border-box;
    display: block;
		width: 100%;
    min-height: 38px;
    padding: 8px 10px;
    border: 1px solid #e2e8e2;
    border-radius: 3px;
    background: #fbfcfa;
    color: #283a2e;
    font: inherit;
  }

  .flyrank-widget__input:focus {
    border-color: var(--flyrank-accent, #087d56);
    outline: 2px solid color-mix(in srgb, var(--flyrank-accent, #087d56) 15%, transparent);
    outline-offset: 1px;
	}

	.flyrank-widget__button {
    box-sizing: border-box;
    width: 100%;
    min-height: 38px;
    margin-top: 2px;
    padding: 8px 12px;
		border: 0;
    border-radius: 3px;
    background: var(--flyrank-accent, #087d56);
    color: #fff;
		cursor: pointer;
    font: 600 13px/1.4 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    justify-content: space-between;
	}

	.flyrank-widget__button:disabled {
		cursor: wait;
		opacity: .65;
	}

	.flyrank-widget__status {
		min-height: 1.4em;
		margin: 12px 0 0;
    color: #728078;
    font-size: 12px;
	}

  .flyrank-widget__honeypot {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
`;

  function getFields(formFields) {
    if (Array.isArray(formFields)) return formFields;
    if (formFields && typeof formFields === "object") {
      return Object.entries(formFields).map(([name, value]) => ({
        name,
        ...(typeof value === "object" ? value : { label: value }),
      }));
    }
    return [];
  }

  function createField(field, index) {
    const name = String(field.name || field.id || `field_${index}`);

    if (field.honeypot) {
      const honeypot = document.createElement("input");
      honeypot.type = "text";
      honeypot.name = name;
      honeypot.hidden = true;
      honeypot.tabIndex = -1;
      honeypot.autocomplete = "off";
      return honeypot;
    }

    const label = document.createElement("label");
    label.className = "flyrank-widget__field";

    const labelText = document.createElement("span");
    labelText.textContent = field.label || name;
    label.appendChild(labelText);

    if (field.required) {
      const required = document.createElement("span");
      required.textContent = " *";
      required.style.color = "#bd624d";
      labelText.appendChild(required);
    }

    const input = document.createElement("input");
    input.className = "flyrank-widget__input";
    input.name = name;
    input.type =
      field.type || (name.toLowerCase().includes("email") ? "email" : "text");
    input.required = Boolean(field.required);
    input.autocomplete = "on";
    label.appendChild(input);
    return label;
  }

  function showMessage(status, message, isError = false) {
    status.textContent = message;
    status.setAttribute("role", isError ? "alert" : "status");
  }

  function createForm(config) {
    const form = document.createElement("form");
    form.className = "flyrank-widget__form";

    const brand = document.createElement("span");
    brand.className = "flyrank-widget__brand";
    brand.textContent = "VERDANT CAPTURE";
    form.appendChild(brand);

    const title = document.createElement("h2");
    title.className = "flyrank-widget__title";
    title.textContent = config.title || "Your widget";
    form.appendChild(title);

    if (config.description) {
      const description = document.createElement("p");
      description.className = "flyrank-widget__description";
      description.textContent = config.description;
      form.appendChild(description);
    }

    getFields(config.form_fields).forEach((field, index) => {
      form.appendChild(createField(field, index));
    });

    const button = document.createElement("button");
    button.className = "flyrank-widget__button";
    button.type = "submit";
    const buttonText = document.createElement("span");
    buttonText.textContent = config.button_text || "Sign up";
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");
    button.append(buttonText, arrow);

    const status = document.createElement("p");
    status.className = "flyrank-widget__status";
    status.setAttribute("aria-live", "polite");
    form.append(button, status);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      showMessage(status, "Submitting...");

      try {
        const response = await fetch(`${apiUrl}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            widget_id: widgetId,
            data: Object.fromEntries(new FormData(form)),
          }),
        });
        const result = await response.json().catch(() => ({}));
        showMessage(
          status,
          result.message ||
            result.error ||
            (response.ok
              ? "Thanks for signing up."
              : "Unable to submit the form."),
          !response.ok,
        );
      } catch {
        showMessage(status, "Unable to reach the submission endpoint.", true);
      } finally {
        button.disabled = false;
      }
    });

    return form;
  }

  function render(config) {
    const widget = document.createElement("div");
    widget.className = "flyrank-widget";
    const accentColor =
      config.display_options?.theme_color || config.display_options?.accent_color;
    if (
      typeof accentColor === "string" &&
      /^#[0-9a-f]{6}$/i.test(accentColor)
    ) {
      widget.style.setProperty("--flyrank-accent", accentColor);
    }
    widget.appendChild(createForm(config));
    root.replaceChildren(widget);
  }

  function showError(message) {
    root.textContent = message;
  }

  script.parentNode.insertBefore(root, script.nextSibling);
  document.head.appendChild(style);

  if (!widgetId) {
    showError("Widget id is missing.");
    return;
  }

  root.textContent = "Loading...";
  fetch(`${apiUrl}/widgets/${encodeURIComponent(widgetId)}/config`)
    .then((response) => {
      if (!response.ok) throw new Error("Widget config could not be loaded");
      return response.json();
    })
    .then((payload) => render(payload.data || payload))
    .catch(() => showError("Widget could not be loaded."));
})();
