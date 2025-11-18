// src/pages/admin/Newsletter.js
import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Eye,
  Users,
  CheckCircle,
  Download,
  TrendingUp,
  Calendar,
  Tag,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import Loading from "../../components/common/Loading";
import Button from "../../components/common/Button";
import toast from "react-hot-toast";
import "./Newsletter.css";

const Newsletter = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    subject: "",
    message: "",
    campaignType: "all",
  });

  useEffect(() => {
    fetchStats();
    fetchTemplates();
    if (activeTab === "subscribers") {
      fetchSubscribers();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get("/newsletter/stats");
      setStats(response.data.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error("Failed to load newsletter statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/newsletter/templates");
      setTemplates(response.data.templates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/newsletter/subscribers", {
        params: { limit: 50 },
      });
      setSubscribers(response.data.subscribers);
    } catch (error) {
      console.error("Failed to fetch subscribers:", error);
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCampaignForm({
      subject: template.subject,
      message: template.defaultMessage,
      campaignType: template.type,
    });
  };

  const handlePreview = async () => {
    if (!campaignForm.subject || !campaignForm.message) {
      toast.error("Please fill in subject and message");
      return;
    }

    try {
      setCampaignLoading(true);
      await api.post("/newsletter/preview", campaignForm);
      toast.success("Preview email sent to your inbox!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send preview");
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignForm.subject || !campaignForm.message) {
      toast.error("Please fill in subject and message");
      return;
    }

    const targetCount = getTargetSubscriberCount();

    if (
      !window.confirm(
        `Send this campaign to ${targetCount} subscriber${
          targetCount !== 1 ? "s" : ""
        }?`
      )
    ) {
      return;
    }

    try {
      setCampaignLoading(true);
      const response = await api.post(
        "/newsletter/send-campaign",
        campaignForm
      );
      toast.success(response.data.message);

      setCampaignForm({
        subject: "",
        message: "",
        campaignType: "all",
      });
      setSelectedTemplate(null);

      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send campaign");
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleExportSubscribers = async () => {
    try {
      const response = await api.get("/newsletter/export", {
        params: { status: "subscribed" },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `subscribers-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Subscribers exported successfully");
    } catch (error) {
      toast.error("Failed to export subscribers");
    }
  };

  const getTargetSubscriberCount = () => {
    if (!stats) return 0;

    switch (campaignForm.campaignType) {
      case "all":
        return stats.totalSubscribers;
      default:
        return Math.floor(stats.totalSubscribers * 0.8);
    }
  };

  if (loading && !stats) {
    return <Loading size="lg" text="Loading newsletter..." fullScreen />;
  }

  return (
    <div className="admin-newsletter">
      <div className="newsletter-header">
        <div>
          <h1>Newsletter Management</h1>
          <p>Manage subscribers and send promotional campaigns</p>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.totalSubscribers.toLocaleString()}</h3>
              <p>Total Subscribers</p>
              <span className="stat-change">
                +{stats.monthlySubscribers} this month
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.totalSubscribers - stats.totalUnsubscribed}</h3>
              <p>Active Subscribers</p>
              <span className="stat-change">Growing steadily</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon unsubscribed">
              <AlertCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.totalUnsubscribed}</h3>
              <p>Unsubscribed</p>
              <span className="stat-change">
                {(
                  (stats.totalUnsubscribed / stats.totalSubscribers) *
                  100
                ).toFixed(1)}
                % rate
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon monthly">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.monthlySubscribers}</h3>
              <p>This Month</p>
              <span className="stat-change">New subscribers</span>
            </div>
          </div>
        </div>
      )}

      <div className="newsletter-tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Mail size={18} />
          Overview
        </button>
        <button
          className={`tab ${activeTab === "campaigns" ? "active" : ""}`}
          onClick={() => setActiveTab("campaigns")}
        >
          <Send size={18} />
          Send Campaign
        </button>
        <button
          className={`tab ${activeTab === "subscribers" ? "active" : ""}`}
          onClick={() => setActiveTab("subscribers")}
        >
          <Users size={18} />
          Subscribers ({stats?.totalSubscribers || 0})
        </button>
      </div>

      {activeTab === "overview" && stats && (
        <div className="overview-content">
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Subscription Sources</h2>
                <Tag size={20} />
              </div>
              <div className="sources-list">
                {stats.bySource && stats.bySource.length > 0 ? (
                  stats.bySource.map((source) => (
                    <div key={source._id} className="source-item">
                      <div className="source-info">
                        <h4>{source._id}</h4>
                        <span>{source.count} subscribers</span>
                      </div>
                      <div className="source-bar">
                        <div
                          className="source-fill"
                          style={{
                            width: `${
                              (source.count / stats.totalSubscribers) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No source data available</p>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <h2>Recent Subscribers</h2>
                <Calendar size={20} />
              </div>
              <div className="recent-list">
                {stats.recentSubscribers &&
                stats.recentSubscribers.length > 0 ? (
                  stats.recentSubscribers.map((sub) => (
                    <div key={sub._id} className="subscriber-item">
                      <div className="subscriber-avatar">
                        <Mail size={16} />
                      </div>
                      <div className="subscriber-info">
                        <h4>{sub.email}</h4>
                        <small>
                          {new Date(sub.subscribedAt).toLocaleDateString()}
                        </small>
                      </div>
                      <span className="source-badge">{sub.source}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No recent subscribers</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "campaigns" && (
        <div className="campaigns-content">
          <div className="campaign-grid">
            <div className="templates-section">
              <h2>Email Templates</h2>
              <div className="templates-list">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`template-card ${
                      selectedTemplate?.id === template.id ? "selected" : ""
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                    <span className="template-type">{template.type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="editor-section">
              <h2>Campaign Editor</h2>

              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={campaignForm.campaignType}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      campaignType: e.target.value,
                    })
                  }
                  className="form-control"
                >
                  <option value="all">All Subscribers</option>
                  <option value="newArrivals">New Arrivals Subscribers</option>
                  <option value="sales">Sales Subscribers</option>
                  <option value="exclusiveOffers">
                    Exclusive Offers Subscribers
                  </option>
                </select>
                <small className="help-text">
                  Will send to approximately {getTargetSubscriberCount()}{" "}
                  subscriber
                  {getTargetSubscriberCount() !== 1 ? "s" : ""}
                </small>
              </div>

              <div className="form-group">
                <label>Email Subject</label>
                <input
                  type="text"
                  value={campaignForm.subject}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      subject: e.target.value,
                    })
                  }
                  placeholder="Enter email subject..."
                  className="form-control"
                  maxLength={100}
                />
                <small className="help-text">
                  {campaignForm.subject.length}/100 characters
                </small>
              </div>

              <div className="form-group">
                <label>Email Message (HTML supported)</label>
                <textarea
                  value={campaignForm.message}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      message: e.target.value,
                    })
                  }
                  placeholder="Enter your message... (HTML tags supported)"
                  rows={12}
                  className="form-control"
                />
              </div>

              <div className="editor-actions">
                <Button
                  onClick={handlePreview}
                  disabled={campaignLoading}
                  variant="secondary"
                >
                  <Eye size={18} />
                  Send Preview
                </Button>
                <Button onClick={handleSendCampaign} disabled={campaignLoading}>
                  <Send size={18} />
                  {campaignLoading ? "Sending..." : "Send Campaign"}
                </Button>
              </div>

              <div className="help-box">
                <p>
                  <strong>💡 Tips:</strong>
                </p>
                <ul>
                  <li>Always send a preview to yourself first</li>
                  <li>Use HTML for formatting</li>
                  <li>Include a clear call-to-action button</li>
                  <li>Keep subject lines under 50 characters</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "subscribers" && (
        <div className="subscribers-content">
          <div className="subscribers-header">
            <h2>All Subscribers</h2>
            <Button onClick={handleExportSubscribers} variant="secondary">
              <Download size={18} />
              Export CSV
            </Button>
          </div>

          {loading ? (
            <Loading size="md" text="Loading subscribers..." />
          ) : subscribers.length === 0 ? (
            <div className="no-subscribers">
              <Mail size={64} />
              <h3>No Subscribers Yet</h3>
              <p>Subscribers will appear here when they sign up</p>
            </div>
          ) : (
            <div className="subscribers-table-container">
              <table className="subscribers-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Subscribed Date</th>
                    <th>Preferences</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => (
                    <tr key={sub._id}>
                      <td>
                        <div className="email-cell">
                          <Mail size={16} />
                          {sub.email}
                        </div>
                      </td>
                      <td>
                        <span className="source-badge">{sub.source}</span>
                      </td>
                      <td>{new Date(sub.subscribedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="preferences">
                          {sub.preferences.newArrivals && (
                            <span className="pref-badge">New Arrivals</span>
                          )}
                          {sub.preferences.sales && (
                            <span className="pref-badge">Sales</span>
                          )}
                          {sub.preferences.exclusiveOffers && (
                            <span className="pref-badge">Exclusive</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${sub.status}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Newsletter;
