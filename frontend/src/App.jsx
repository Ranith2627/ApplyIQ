import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const emptyForm = {
  company: "",
  job_title: "",
  location: "",
  job_url: "",
  status: "Saved",
  resume_version: "",
  work_authorization_notes: "",
  notes: "",
  date_applied: "",
  follow_up_date: "",
  ai_recommendation: "",
  ai_reason: "",
  eligibility_warning: "",
  ai_job_summary: "",
  ai_match_explanation: "",
};

function App() {
  const [activeView, setActiveView] = useState("dashboard");

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [result, setResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fileName, setFileName] = useState("");

  const [applications, setApplications] = useState([]);

  const [dashboard, setDashboard] = useState({
    total: 0,
    saved: 0,
    applied: 0,
    interview: 0,
    rejected: 0,
    offer: 0,
    interview_rate: 0,
    offer_rate: 0,
  });

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadApplications();
    loadDashboard();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/applications`
      );

      if (!response.ok) {
        throw new Error(
          "Could not load applications."
        );
      }

      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/dashboard`
      );

      if (!response.ok) {
        throw new Error(
          "Could not load dashboard."
        );
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error(error);
    }
  };

  const refreshTracker = async () => {
    await Promise.all([
      loadApplications(),
      loadDashboard(),
    ]);
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please select a PDF resume.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const response = await fetch(
        `${API_BASE}/upload-resume`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Resume upload failed."
        );
      }

      setResumeText(data.resume_text);
      setFileName(data.filename);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const analyzeJob = async () => {
    if (
      !resumeText.trim() ||
      !jobDescription.trim()
    ) {
      alert(
        "Please provide both a resume and job description."
      );
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(
        `${API_BASE}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          "Technical analysis failed."
        );
      }

      setResult(data);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    if (
      !resumeText.trim() ||
      !jobDescription.trim()
    ) {
      alert(
        "Please provide both a resume and job description."
      );
      return;
    }

    try {
      setAiLoading(true);
      setAiResult(null);

      const response = await fetch(
        `${API_BASE}/ai-analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "AI analysis failed."
        );
      }

      setAiResult(data);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const runFullAnalysis = async () => {
    if (
      !resumeText.trim() ||
      !jobDescription.trim()
    ) {
      alert(
        "Please provide both a resume and job description."
      );
      return;
    }

    await Promise.all([
      analyzeJob(),
      analyzeWithAI(),
    ]);
  };

  const clearAnalysis = () => {
    setResumeText("");
    setJobDescription("");
    setResult(null);
    setAiResult(null);
    setFileName("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const getScoreLabel = () => {
    if (!result) {
      return "";
    }

    if (result.match_percentage >= 80) {
      return "Excellent Match";
    }

    if (result.match_percentage >= 60) {
      return "Strong Match";
    }

    if (result.match_percentage >= 40) {
      return "Moderate Match";
    }

    return "Low Match";
  };

  const getRuleSuggestions = () => {
    if (!result) {
      return [];
    }

    const suggestions = [];

    if (result.missing_skills.length > 0) {
      suggestions.push(
        `Missing detected skills: ${result.missing_skills.join(
          ", "
        )}. Only add them to your resume if you have actually used them.`
      );
    }

    if (result.matched_skills.length > 0) {
      suggestions.push(
        `Highlight these matching skills clearly: ${result.matched_skills.join(
          ", "
        )}.`
      );
    }

    if (result.match_percentage < 60) {
      suggestions.push(
        "Consider using a more targeted resume version for this type of role."
      );
    }

    return suggestions;
  };

  const cleanApplicationPayload = () => {
    return {
      company: form.company,
      job_title: form.job_title,
      location: form.location || null,
      job_url: form.job_url || null,
      status: form.status,

      match_score:
        result
          ? result.match_percentage
          : null,

      resume_version:
        form.resume_version || null,

      work_authorization_notes:
        form.work_authorization_notes || null,

      notes:
        form.notes || null,

      date_applied:
        form.date_applied || null,

      follow_up_date:
        form.follow_up_date || null,

      ai_recommendation:
        aiResult?.recommended_action ||
        form.ai_recommendation ||
        null,

      ai_reason:
        aiResult?.recommended_action_reason ||
        form.ai_reason ||
        null,

      eligibility_warning:
        aiResult?.eligibility_warning ||
        form.eligibility_warning ||
        null,

      ai_job_summary:
        aiResult?.job_summary ||
        form.ai_job_summary ||
        null,

      ai_match_explanation:
        aiResult?.match_explanation ||
        form.ai_match_explanation ||
        null,
    };
  };

  const saveApplication = async () => {
    if (
      !form.company.trim() ||
      !form.job_title.trim()
    ) {
      alert(
        "Company and job title are required."
      );
      return;
    }

    const payload = cleanApplicationPayload();

    try {
      const wasEditing = Boolean(editingId);

      const endpoint = editingId
        ? `${API_BASE}/applications/${editingId}`
        : `${API_BASE}/applications`;

      const response = await fetch(
        endpoint,
        {
          method:
            editingId
              ? "PUT"
              : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.detail ||
            "Could not save application."
        );
      }

      setForm(emptyForm);
      setEditingId(null);

      await refreshTracker();

      alert(
        wasEditing
          ? "Application updated."
          : "Application saved."
      );

      setActiveView("applications");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const prepareAnalysisForTracker = () => {
    if (!result && !aiResult) {
      alert("Run an analysis first.");
      return;
    }

    setForm((previous) => ({
      ...previous,

      work_authorization_notes:
        previous.work_authorization_notes ||
        aiResult?.eligibility_warning ||
        "",

      ai_recommendation:
        aiResult?.recommended_action || "",

      ai_reason:
        aiResult?.recommended_action_reason || "",

      eligibility_warning:
        aiResult?.eligibility_warning || "",

      ai_job_summary:
        aiResult?.job_summary || "",

      ai_match_explanation:
        aiResult?.match_explanation || "",
    }));

    setActiveView("applications");

    setTimeout(() => {
      document
        .getElementById("application-form")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 100);
  };

  const editApplication = (application) => {
    setEditingId(application.id);

    setForm({
      company:
        application.company || "",

      job_title:
        application.job_title || "",

      location:
        application.location || "",

      job_url:
        application.job_url || "",

      status:
        application.status || "Saved",

      resume_version:
        application.resume_version || "",

      work_authorization_notes:
        application.work_authorization_notes || "",

      notes:
        application.notes || "",

      date_applied:
        application.date_applied || "",

      follow_up_date:
        application.follow_up_date || "",

      ai_recommendation:
        application.ai_recommendation || "",

      ai_reason:
        application.ai_reason || "",

      eligibility_warning:
        application.eligibility_warning || "",

      ai_job_summary:
        application.ai_job_summary || "",

      ai_match_explanation:
        application.ai_match_explanation || "",
    });

    if (application.match_score !== null) {
      setResult({
        match_percentage:
          application.match_score,
        required_skills: [],
        matched_skills: [],
        missing_skills: [],
      });
    }

    setActiveView("applications");

    setTimeout(() => {
      document
        .getElementById("application-form")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 100);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateStatus = async (
    applicationId,
    newStatus
  ) => {
    try {
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not update status."
        );
      }

      await refreshTracker();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const deleteApplication = async (
    applicationId
  ) => {
    const confirmed = window.confirm(
      "Delete this application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not delete application."
        );
      }

      await refreshTracker();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const exportApplications = () => {
    window.open(
      `${API_BASE}/applications-export`,
      "_blank"
    );
  };

  const toggleDetails = (applicationId) => {
    setExpandedId(
      expandedId === applicationId
        ? null
        : applicationId
    );
  };

  const filteredApplications = useMemo(() => {
    return applications.filter(
      (application) => {
        const search = searchTerm
          .trim()
          .toLowerCase();

        const matchesSearch =
          application.company
            .toLowerCase()
            .includes(search) ||
          application.job_title
            .toLowerCase()
            .includes(search) ||
          (application.location || "")
            .toLowerCase()
            .includes(search);

        const matchesStatus =
          statusFilter === "All" ||
          application.status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    applications,
    searchTerm,
    statusFilter,
  ]);

  const recentApplications =
    applications.slice(0, 5);

  const recommendationClass = (
    recommendation
  ) => {
    if (!recommendation) {
      return "neutral";
    }

    return recommendation
      .toLowerCase()
      .replaceAll(" ", "-");
  };

  const renderDashboard = () => (
    <>
      <section className="hero-card">
        <div>
          <span className="eyebrow">
            JOB SEARCH COMMAND CENTER
          </span>

          <h1>
            Build a smarter path to your
            next opportunity.
          </h1>

          <p>
            Analyze job fit, understand your
            skill gaps, review eligibility,
            and manage your application
            pipeline from one workspace.
          </p>

          <div className="hero-actions">
            <button
              className="primary-cta"
              onClick={() =>
                setActiveView("analyze")
              }
            >
              Analyze a Job
            </button>

            <button
              className="ghost-cta"
              onClick={() =>
                setActiveView(
                  "applications"
                )
              }
            >
              View Applications
            </button>
          </div>
        </div>

        <div className="hero-score-box">
          <span>Interview Rate</span>

          <strong>
            {dashboard.interview_rate}%
          </strong>

          <p>
            Based on your current
            application pipeline.
          </p>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <span className="eyebrow">
            OVERVIEW
          </span>

          <h2>
            Application performance
          </h2>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon">
            01
          </div>

          <span>Total Applications</span>

          <strong>
            {dashboard.total}
          </strong>

          <p>
            All tracked opportunities
          </p>
        </article>

        <article className="metric-card">
          <div className="metric-icon">
            02
          </div>

          <span>Applied</span>

          <strong>
            {dashboard.applied}
          </strong>

          <p>
            Applications submitted
          </p>
        </article>

        <article className="metric-card">
          <div className="metric-icon">
            03
          </div>

          <span>Interviews</span>

          <strong>
            {dashboard.interview}
          </strong>

          <p>
            Active interview pipeline
          </p>
        </article>

        <article className="metric-card">
          <div className="metric-icon">
            04
          </div>

          <span>Offers</span>

          <strong>
            {dashboard.offer}
          </strong>

          <p>
            Successful outcomes
          </p>
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="surface-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">
                PIPELINE
              </span>

              <h3>
                Recent Applications
              </h3>
            </div>

            <button
              className="text-button"
              onClick={() =>
                setActiveView(
                  "applications"
                )
              }
            >
              View all
            </button>
          </div>

          {recentApplications.length ===
          0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                +
              </div>

              <h4>
                No applications yet
              </h4>

              <p>
                Add your first opportunity
                to start building your
                pipeline.
              </p>
            </div>
          ) : (
            <div className="recent-list">
              {recentApplications.map(
                (application) => (
                  <div
                    className="recent-item"
                    key={application.id}
                  >
                    <div className="company-avatar">
                      {application.company
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="recent-copy">
                      <strong>
                        {
                          application.job_title
                        }
                      </strong>

                      <span>
                        {application.company}
                      </span>
                    </div>

                    <span
                      className={`status-pill ${application.status.toLowerCase()}`}
                    >
                      {application.status}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </article>

        <article className="surface-card insights-card">
          <span className="eyebrow">
            INSIGHTS
          </span>

          <h3>
            Pipeline health
          </h3>

          <div className="insight-stat">
            <span>
              Interview Rate
            </span>

            <strong>
              {dashboard.interview_rate}%
            </strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  dashboard.interview_rate,
                  100
                )}%`,
              }}
            />
          </div>

          <div className="insight-stat">
            <span>
              Offer Rate
            </span>

            <strong>
              {dashboard.offer_rate}%
            </strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill secondary"
              style={{
                width: `${Math.min(
                  dashboard.offer_rate,
                  100
                )}%`,
              }}
            />
          </div>
        </article>
      </section>
    </>
  );

  const renderAnalyzer = () => (
    <>
      <section className="page-title">
        <div>
          <span className="eyebrow">
            AI JOB MATCH
          </span>

          <h1>
            Find out how well you fit
            before you apply.
          </h1>

          <p>
            Combine technical skill
            matching with AI-powered
            analysis.
          </p>
        </div>
      </section>

      <section className="analyzer-grid">
        <article className="surface-card analyzer-input">
          <div className="card-number">
            01
          </div>

          <h3>Your Resume</h3>

          <p>
            Upload a PDF or paste your
            resume text.
          </p>

          <label className="premium-upload">
            <span>
              {uploading
                ? "Reading resume..."
                : "Upload PDF Resume"}
            </span>

            <small>
              PDF files supported
            </small>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={
                handleResumeUpload
              }
            />
          </label>

          {fileName && (
            <div className="uploaded-file">
              <span>✓</span>
              {fileName}
            </div>
          )}

          <textarea
            className="modern-textarea"
            placeholder="Paste resume text..."
            value={resumeText}
            onChange={(event) =>
              setResumeText(
                event.target.value
              )
            }
          />
        </article>

        <article className="surface-card analyzer-input">
          <div className="card-number">
            02
          </div>

          <h3>Job Description</h3>

          <p>
            Paste the complete job
            posting.
          </p>

          <textarea
            className="modern-textarea job-textarea"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(
                event.target.value
              )
            }
          />
        </article>
      </section>

      <div className="analysis-control-bar">
        <button
          className="analysis-button secondary-action"
          onClick={analyzeJob}
          disabled={loading}
        >
          {loading
            ? "Analyzing..."
            : "Technical Match"}
        </button>

        <button
          className="analysis-button ai-action"
          onClick={analyzeWithAI}
          disabled={aiLoading}
        >
          {aiLoading
            ? "AI Analyzing..."
            : "AI Analyze"}
        </button>

        <button
          className="analysis-button main-action"
          onClick={runFullAnalysis}
          disabled={
            loading || aiLoading
          }
        >
          Run Full Analysis
        </button>

        <button
          className="clear-button"
          onClick={clearAnalysis}
        >
          Clear
        </button>
      </div>

      {(result || aiResult) && (
        <section className="results-zone">
          <div className="section-heading result-heading">
            <div>
              <span className="eyebrow">
                RESULTS
              </span>

              <h2>
                Your job match analysis
              </h2>
            </div>

            <button
              className="primary-cta"
              onClick={
                prepareAnalysisForTracker
              }
            >
              Add to Tracker
            </button>
          </div>

          {result && (
            <>
              <section className="score-layout">
                <article className="score-visual">
                  <div
                    className="score-ring"
                    style={{
                      "--score":
                        `${result.match_percentage}`,
                    }}
                  >
                    <div className="score-inner">
                      <strong>
                        {
                          result.match_percentage
                        }
                        %
                      </strong>

                      <span>
                        Technical Match
                      </span>
                    </div>
                  </div>

                  <div className="score-copy">
                    <span className="eyebrow">
                      MATCH QUALITY
                    </span>

                    <h3>
                      {getScoreLabel()}
                    </h3>

                    <p>
                      Your resume matches{" "}
                      {
                        result.matched_skills
                          .length
                      }{" "}
                      of{" "}
                      {
                        result.required_skills
                          .length
                      }{" "}
                      detected skills.
                    </p>
                  </div>
                </article>

                <article className="score-stat-card">
                  <span>Required</span>
                  <strong>
                    {
                      result.required_skills
                        .length
                    }
                  </strong>
                </article>

                <article className="score-stat-card">
                  <span>Matched</span>
                  <strong>
                    {
                      result.matched_skills
                        .length
                    }
                  </strong>
                </article>

                <article className="score-stat-card">
                  <span>Missing</span>
                  <strong>
                    {
                      result.missing_skills
                        .length
                    }
                  </strong>
                </article>
              </section>

              <section className="skill-panels">
                <article className="skill-panel">
                  <span className="panel-label">
                    REQUIRED
                  </span>

                  <h3>
                    Required Skills
                  </h3>

                  <div className="chip-cloud">
                    {result.required_skills.map(
                      (skill) => (
                        <span
                          className="skill-chip"
                          key={skill}
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </article>

                <article className="skill-panel success">
                  <span className="panel-label">
                    MATCHED
                  </span>

                  <h3>
                    Your Strengths
                  </h3>

                  <div className="chip-cloud">
                    {result.matched_skills.map(
                      (skill) => (
                        <span
                          className="skill-chip success"
                          key={skill}
                        >
                          ✓ {skill}
                        </span>
                      )
                    )}
                  </div>
                </article>

                <article className="skill-panel danger">
                  <span className="panel-label">
                    GAPS
                  </span>

                  <h3>
                    Missing Skills
                  </h3>

                  <div className="chip-cloud">
                    {result.missing_skills.map(
                      (skill) => (
                        <span
                          className="skill-chip danger"
                          key={skill}
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </article>
              </section>
            </>
          )}

          {aiResult && (
            <section className="ai-analysis-shell">
              <div
                className={`recommendation-banner ${recommendationClass(
                  aiResult.recommended_action
                )}`}
              >
                <div>
                  <span className="eyebrow">
                    AI RECOMMENDATION
                  </span>

                  <strong>
                    {
                      aiResult.recommended_action
                    }
                  </strong>
                </div>

                <p>
                  {
                    aiResult.recommended_action_reason
                  }
                </p>
              </div>

              <div className="ai-content-grid">
                <article className="surface-card">
                  <span className="eyebrow">
                    ROLE SUMMARY
                  </span>

                  <h3>
                    What this job is
                    really asking for
                  </h3>

                  <p className="body-copy">
                    {aiResult.job_summary}
                  </p>
                </article>

                <article className="surface-card">
                  <span className="eyebrow">
                    MATCH EXPLANATION
                  </span>

                  <h3>
                    Why you fit
                  </h3>

                  <p className="body-copy">
                    {
                      aiResult.match_explanation
                    }
                  </p>
                </article>
              </div>

              <div className="ai-content-grid">
                <article className="surface-card list-card success-list">
                  <span className="eyebrow">
                    STRENGTHS
                  </span>

                  <h3>
                    What helps you
                  </h3>

                  <ul>
                    {aiResult.strengths?.map(
                      (item, index) => (
                        <li key={index}>
                          <span>✓</span>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </article>

                <article className="surface-card list-card">
                  <span className="eyebrow">
                    GAPS
                  </span>

                  <h3>
                    What to improve
                  </h3>

                  <ul>
                    {aiResult.gaps?.map(
                      (item, index) => (
                        <li key={index}>
                          <span>•</span>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </article>
              </div>

              <div className="ai-content-grid">
                <article className="surface-card list-card">
                  <span className="eyebrow">
                    REQUIREMENTS
                  </span>

                  <h3>
                    Important job
                    requirements
                  </h3>

                  <ul>
                    {aiResult.important_requirements?.map(
                      (item, index) => (
                        <li key={index}>
                          <span>→</span>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </article>

                <article className="surface-card list-card">
                  <span className="eyebrow">
                    RESUME
                  </span>

                  <h3>
                    Resume improvements
                  </h3>

                  <ul>
                    {aiResult.resume_suggestions?.map(
                      (item, index) => (
                        <li key={index}>
                          <span>→</span>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </article>
              </div>

              <article
                className={`eligibility-panel ${
                  aiResult.eligibility_warning
                    ? "warning"
                    : "clear"
                }`}
              >
                <div className="eligibility-icon">
                  {aiResult.eligibility_warning
                    ? "!"
                    : "✓"}
                </div>

                <div>
                  <span className="eyebrow">
                    WORK AUTHORIZATION
                  </span>

                  <h3>
                    Eligibility review
                  </h3>

                  <p>
                    {aiResult
                      .eligibility_warning ||
                      "No specific work authorization restriction was detected."}
                  </p>
                </div>
              </article>
            </section>
          )}
        </section>
      )}
    </>
  );

  const renderApplications = () => (
    <>
      <section className="page-title applications-title">
        <div>
          <span className="eyebrow">
            APPLICATION PIPELINE
          </span>

          <h1>
            Track every opportunity in
            one place.
          </h1>

          <p>
            Keep applications, AI
            recommendations, follow-ups,
            and outcomes organized.
          </p>
        </div>

        <button
          className="export-button"
          onClick={exportApplications}
        >
          Export CSV
        </button>
      </section>

      <section
        className="surface-card application-form-card"
        id="application-form"
      >
        <div className="card-heading">
          <div>
            <span className="eyebrow">
              {editingId
                ? "EDIT RECORD"
                : "NEW APPLICATION"}
            </span>

            <h3>
              {editingId
                ? "Update application"
                : "Add opportunity"}
            </h3>
          </div>
        </div>

        {(result || aiResult) &&
          !editingId && (
            <div className="linked-analysis">
              <span>AI</span>

              Current analysis will be
              attached to this application.
            </div>
          )}

        <div className="form-grid">
          <div className="field-group">
            <label>Company</label>

            <input
              name="company"
              placeholder="e.g. Microsoft"
              value={form.company}
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Job Title</label>

            <input
              name="job_title"
              placeholder="e.g. Software Engineer I"
              value={form.job_title}
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Location</label>

            <input
              name="location"
              placeholder="City, State or Remote"
              value={form.location}
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Job URL</label>

            <input
              name="job_url"
              placeholder="https://..."
              value={form.job_url}
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Status</label>

            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
            >
              <option value="Saved">
                Saved
              </option>

              <option value="Applied">
                Applied
              </option>

              <option value="Interview">
                Interview
              </option>

              <option value="Rejected">
                Rejected
              </option>

              <option value="Offer">
                Offer
              </option>
            </select>
          </div>

          <div className="field-group">
            <label>Resume Version</label>

            <input
              name="resume_version"
              placeholder="Software Resume"
              value={
                form.resume_version
              }
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>
              Work Authorization Notes
            </label>

            <input
              name="work_authorization_notes"
              placeholder="OPT / sponsorship notes"
              value={
                form.work_authorization_notes
              }
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Notes</label>

            <input
              name="notes"
              placeholder="Personal notes"
              value={form.notes}
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Date Applied</label>

            <input
              type="date"
              name="date_applied"
              value={form.date_applied}
              onChange={handleFormChange}
            />
          </div>

          <div className="field-group">
            <label>Follow-Up Date</label>

            <input
              type="date"
              name="follow_up_date"
              value={
                form.follow_up_date
              }
              onChange={handleFormChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            className="primary-cta"
            onClick={saveApplication}
          >
            {editingId
              ? "Update Application"
              : "Save Application"}
          </button>

          {editingId && (
            <button
              className="ghost-cta"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="surface-card tracker-card">
        <div className="tracker-toolbar">
          <div>
            <span className="eyebrow">
              TRACKER
            </span>

            <h3>
              Your applications
            </h3>
          </div>

          <div className="tracker-controls">
            <input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All statuses
              </option>

              <option value="Saved">
                Saved
              </option>

              <option value="Applied">
                Applied
              </option>

              <option value="Interview">
                Interview
              </option>

              <option value="Rejected">
                Rejected
              </option>

              <option value="Offer">
                Offer
              </option>
            </select>
          </div>
        </div>

        {filteredApplications.length ===
        0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              ◌
            </div>

            <h4>
              No applications found
            </h4>

            <p>
              Try changing your filters
              or add a new application.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Match</th>
                  <th>AI</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Follow-Up</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredApplications.map(
                  (application) => (
                    <Fragment
                      key={application.id}
                    >
                      <tr>
                        <td>
                          <div className="company-cell">
                            <div className="company-avatar small">
                              {application.company
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {
                                  application.company
                                }
                              </strong>

                              <span>
                                {application.location ||
                                  "Location not set"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {
                              application.job_title
                            }
                          </strong>
                        </td>

                        <td>
                          {application.match_score !==
                          null ? (
                            <span className="match-pill">
                              {
                                application.match_score
                              }
                              %
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          {application.ai_recommendation ? (
                            <span
                              className={`ai-pill ${recommendationClass(
                                application.ai_recommendation
                              )}`}
                            >
                              {
                                application.ai_recommendation
                              }
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          <select
                            className={`status-select ${application.status.toLowerCase()}`}
                            value={
                              application.status
                            }
                            onChange={(event) =>
                              updateStatus(
                                application.id,
                                event.target.value
                              )
                            }
                          >
                            <option value="Saved">
                              Saved
                            </option>

                            <option value="Applied">
                              Applied
                            </option>

                            <option value="Interview">
                              Interview
                            </option>

                            <option value="Rejected">
                              Rejected
                            </option>

                            <option value="Offer">
                              Offer
                            </option>
                          </select>
                        </td>

                        <td>
                          {application.date_applied ||
                            "-"}
                        </td>

                        <td>
                          {application.follow_up_date ||
                            "-"}
                        </td>

                        <td>
                          <div className="row-actions">
                            {application.job_url && (
                              <a
                                href={
                                  application.job_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="icon-action"
                              >
                                ↗
                              </a>
                            )}

                            <button
                              className="icon-action"
                              onClick={() =>
                                toggleDetails(
                                  application.id
                                )
                              }
                            >
                              {expandedId ===
                              application.id
                                ? "−"
                                : "+"}
                            </button>

                            <button
                              className="icon-action"
                              onClick={() =>
                                editApplication(
                                  application
                                )
                              }
                            >
                              ✎
                            </button>

                            <button
                              className="icon-action danger"
                              onClick={() =>
                                deleteApplication(
                                  application.id
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedId ===
                        application.id && (
                        <tr className="detail-row">
                          <td colSpan="8">
                            <div className="detail-grid">
                              <div>
                                <span className="detail-label">
                                  AI Recommendation
                                </span>

                                <p>
                                  {application.ai_reason ||
                                    "No AI recommendation saved."}
                                </p>
                              </div>

                              <div>
                                <span className="detail-label">
                                  Job Summary
                                </span>

                                <p>
                                  {application.ai_job_summary ||
                                    "No AI summary saved."}
                                </p>
                              </div>

                              <div>
                                <span className="detail-label">
                                  Match Explanation
                                </span>

                                <p>
                                  {application.ai_match_explanation ||
                                    "No explanation saved."}
                                </p>
                              </div>

                              <div>
                                <span className="detail-label">
                                  Eligibility
                                </span>

                                <p>
                                  {application.eligibility_warning ||
                                    "No eligibility warning saved."}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            A
          </div>

          <div>
            <strong>ApplyIQ</strong>
            <span>
              AI Career Workspace
            </span>
          </div>
        </div>

        <nav className="nav-list">
          <button
            className={
              activeView === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveView("dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              activeView === "analyze"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveView("analyze")
            }
          >
            <span>✦</span>
            Analyze Job
          </button>

          <button
            className={
              activeView === "applications"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveView(
                "applications"
              )
            }
          >
            <span>▣</span>
            Applications
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-mini-card">
            <span>AI READY</span>

            <strong>
              Smart job matching
            </strong>

            <p>
              Technical analysis +
              AI recommendations.
            </p>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="topbar-label">
              APPLYIQ WORKSPACE
            </span>
          </div>

          <div className="topbar-actions">
            <div className="status-indicator">
              <span />
              System Online
            </div>

            <div className="profile-chip">
              R
            </div>
          </div>
        </header>

        <main className="main-content">
          {activeView === "dashboard" &&
            renderDashboard()}

          {activeView === "analyze" &&
            renderAnalyzer()}

          {activeView === "applications" &&
            renderApplications()}
        </main>
      </div>
    </div>
  );
}

export default App;