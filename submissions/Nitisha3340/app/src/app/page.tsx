"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { AnalysisRecord, UnitImage } from "prep-manager-agent/domain/types";
import { CHECK_IDS } from "prep-manager-agent/domain/types";
import type { AnalyzeResponse } from "../lib/api-types";
import { CHECK_LABELS } from "../lib/api-types";

interface SelectedImage extends UnitImage {
  previewUrl: string;
}

const initialForm = {
  unitId: "UNIT-DEMO-0001",
  recordId: "PRP-DEMO-0001",
  orgId: "org_demo_alpha",
  workOrderId: "",
  sku: "",
  fnsku: "",
  provider: "mock" as "mock" | "gemini",
};

function readImage(file: File): Promise<SelectedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const separator = dataUrl.indexOf(",");
      resolve({
        imageReference: file.name,
        mimeType: file.type as UnitImage["mimeType"],
        dataBase64: separator >= 0 ? dataUrl.slice(separator + 1) : dataUrl,
        previewUrl: dataUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function statusClass(status: AnalysisRecord["status"]): string {
  return `status ${status.toLowerCase()}`;
}

function formatBoxes(boxes: number[][]): string {
  return boxes.length === 0 ? "No bounding box returned" : boxes.map((box) => `[${box.join(", ")}]`).join(" ");
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectImages = async (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(event.target.files ?? []);
    try {
      const selected = await Promise.all(files.map(readImage));
      setImages((current) => [...current, ...selected]);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Could not read the selected images.");
    } finally {
      event.target.value = "";
    }
  };

  const removeImage = (imageReference: string, index: number) => {
    setImages((current) => current.filter((image, imageIndex) => imageIndex !== index || image.imageReference !== imageReference));
    setResult(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (images.length === 0) {
      setError("Add at least one product image before analysis.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          images: images.map(({ previewUrl: _previewUrl, ...image }) => image),
        }),
      });
      const payload = await response.json() as AnalyzeResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Analysis request failed.");
      }
      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Analysis request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div>
            <div className="eyebrow">CUBE / Commerce Context / 02</div>
            <h1 className="title">Prep Manager</h1>
            <p className="subtitle">Capture the proof of preparation before a unit leaves the prep bench.</p>
          </div>
          <div className="system-pill"><span className="system-dot" /> local operator console</div>
        </header>

        <div className="workspace">
          <section className="panel panel-inner" aria-labelledby="capture-title">
            <h2 className="panel-title" id="capture-title">New unit capture</h2>
            <p className="panel-note">Images stay in this request. The selected provider receives one batched unit analysis.</p>
            <form onSubmit={submit}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="unitId">Unit ID</label>
                  <input id="unitId" value={form.unitId} onChange={(event) => updateField("unitId", event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="recordId">Record ID</label>
                  <input id="recordId" value={form.recordId} onChange={(event) => updateField("recordId", event.target.value)} required />
                </div>
                <div className="field full">
                  <label htmlFor="orgId">Organization ID</label>
                  <input id="orgId" value={form.orgId} onChange={(event) => updateField("orgId", event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="workOrderId">Work order</label>
                  <input id="workOrderId" value={form.workOrderId} onChange={(event) => updateField("workOrderId", event.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <label htmlFor="sku">SKU</label>
                  <input id="sku" value={form.sku} onChange={(event) => updateField("sku", event.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <label htmlFor="fnsku">FNSKU</label>
                  <input id="fnsku" value={form.fnsku} onChange={(event) => updateField("fnsku", event.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <label htmlFor="provider">Analysis provider</label>
                  <select id="provider" value={form.provider} onChange={(event) => updateField("provider", event.target.value)}>
                    <option value="mock">Deterministic mock</option>
                    <option value="gemini">Gemini REST</option>
                  </select>
                </div>
              </div>

              <div className="upload-zone">
                <div>
                  <div className="evidence-label">Product photographs</div>
                  <p className="panel-note" style={{ margin: "7px 0 0" }}>Select every angle available for this unit.</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={selectImages} />
                {images.length > 0 && (
                  <div className="preview-grid" aria-label="Selected product images">
                    {images.map((image, index) => (
                      <div className="preview" key={`${image.imageReference}-${index}`}>
                        <img src={image.previewUrl} alt={`Selected product view ${index + 1}`} />
                        <button type="button" onClick={() => removeImage(image.imageReference, index)} aria-label={`Remove ${image.imageReference}`}>×</button>
                        <div className="preview-name">{image.imageReference}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Analyzing one unit…" : "Analyze Preparation"}
              </button>
              {error && <div className="error-banner" role="alert">{error}</div>}
            </form>
          </section>

          <section className="panel results-panel" aria-live="polite" aria-labelledby="results-title">
            {!result ? (
              <div className="empty-state">
                <div>
                  <div className="empty-mark">◎</div>
                  <h2 id="results-title">Evidence will appear here</h2>
                  <p>Choose a provider, add the unit photographs, and run one six-check preparation analysis.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="result-head">
                  <div className="result-context">
                    <strong id="results-title">{result.capture.unitId}</strong>
                    <span>{result.capture.recordId} · {result.capture.orgId} · {result.analysis.modelCalls} model call</span>
                  </div>
                  <span className={statusClass(result.analysis.status)}>{result.analysis.status}</span>
                </div>
                {result.analysis.status === "PENDING" && (
                  <p className="system-note">
                    {result.analysis.failureReason ?? "The provider did not complete this analysis."} The capture and image references remain recorded for later review.
                  </p>
                )}
                <div className="check-list">
                  {CHECK_IDS.map((checkId) => {
                    const check = result.analysis.checks[checkId];
                    return (
                      <article className="check-card" key={checkId}>
                        <div className="check-top">
                          <div className="check-name">
                            <strong>{CHECK_LABELS[checkId]}</strong>
                            <code>{checkId}</code>
                          </div>
                          <span className={statusClass(check.verdict)}>{check.verdict}</span>
                        </div>
                        <div className="check-body">
                          <div className="evidence-block">
                            <div className="evidence-label">Why</div>
                            <p className="evidence-value">{check.explanation}</p>
                          </div>
                          <div className="evidence-block">
                            <div className="evidence-label">Observed evidence</div>
                            <p className="evidence-value">{check.observation || "No observation recorded."}</p>
                          </div>
                          <div className="meta-strip">
                            <span className="meta-chip">quality: {check.evidenceQuality}</span>
                            <span className="meta-chip">image: {check.imageReferences[0] ?? "none"}</span>
                            <span className="meta-chip">OCR: {check.ocrText ?? "none"}</span>
                            <span className="meta-chip">boxes: {formatBoxes(check.boundingBoxes)}</span>
                            {check.spatialRelation?.placement && <span className="meta-chip">placement: {check.spatialRelation.placement}</span>}
                            {check.observedHandlingMarks && <span className="meta-chip">marks: {check.observedHandlingMarks.join(", ") || "none"}</span>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
