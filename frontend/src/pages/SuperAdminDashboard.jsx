import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { toast } from "react-hot-toast";
import Skeleton from "../components/Skeleton";

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tenants");
      setTenants(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch = tenant.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? tenant.isActive : !tenant.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter]);

  const toggleTenantStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/tenants/${id}/status`, { isActive: !currentStatus });
      toast.success("Status updated successfully");
      fetchTenants();
    } catch (error) {
      console.error("Error updating tenant status:", error);
      toast.error("Error updating tenant status");
    }
  };

  return (
    <div className="page">
      <Helmet>
        <title>Super Admin Dashboard - Fleetiva Roadlines</title>
        <meta name="description" content="Manage tenants, subscriptions, and system-wide settings." />
      </Helmet>
      <div className="page-content">
        <div className="page-header" style={{ marginBottom: "24px" }}>
          <div style={{ flex: 1 }}>
            <h2 className="page-title">Company Management</h2>
            <p className="page-subtitle">
              Oversee tenant subscriptions and platform access at a glance.
            </p>
          </div>
          <div className="flex gap-4" style={{ marginTop: "16px" }}>
            <input
              type="text"
              placeholder="Search companies..."
              className="form-control"
              style={{ maxWidth: "300px" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="form-control"
              style={{ maxWidth: "150px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <section className="stack">
          <div className="flex justify-between items-center">
            <h3 className="section-title">Registered Companies</h3>
            <span className="text-muted">
              Showing {filteredTenants.length} of {tenants.length}
            </span>
          </div>

          {loading ? (
            <div className="card-grid cols-2">
              {[1, 2].map((n) => (
                <div key={n} className="card">
                  <Skeleton width="100%" height="120px" borderRadius="16px" />
                </div>
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="card text-center" style={{ padding: "40px" }}>
              <p className="text-muted">No companies found matching your criteria.</p>
            </div>
          ) : (
            <div className="card-grid cols-2">
              {filteredTenants.map((tenant) => (
                <div key={tenant._id} className="card">
                  <div className="page-header">
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{tenant.name}</p>
                      <p className="text-muted" style={{ margin: "6px 0 0" }}>
                        Plan: {tenant.plan?.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`tag ${tenant.isActive ? "success" : "danger"}`}
                    >
                      {tenant.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleTenantStatus(tenant._id, tenant.isActive)}
                    className={`btn ${tenant.isActive ? "btn-danger" : "btn-success"}`}
                    style={{ width: "100%", marginTop: 16 }}
                  >
                    {tenant.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
