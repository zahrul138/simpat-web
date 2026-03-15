const PAGE_LABELS = {
  "/landing-page":         "Landing Page",
  "/target-schedule":      "Target Schedule",
  "/target-scanning":      "Target Scanning",
  "/production-monitoring":"Production Monitoring",
  "/mh-local-schedule":    "Local Schedule (MH)",
  "/part-enquiry-non-id":  "Request Parts",
  "/stock-overview-mh":    "Stock Overview (MH)",
  "/return-parts":         "Return Parts",
  "/local-schedule":       "Local Schedule",
  "/oversea-schedule":     "Oversea Schedule",
  "/storage-inventory":    "Storage Inventory",
  "/stock-overview":       "Stock Overview",
  "/part-details":         "Part Details",
  "/vendor-details":       "Vendor Details",
  "/vendor-placement":     "Vendor Placement",
  "/receive-request":      "Receive Request",
  "/rtv-part":             "RTV Control",
  "/part-disposal-report": "Disposal Report",
  "/qc-local-schedule":    "Local Schedule (QC)",
  "/qc-oversea-schedule":  "Oversea Schedule (QC)",
  "/qc-part":              "Quality Part",
  "/qc-return-parts":      "Return Parts (QC)",
  "/quality-dashboard":    "QC Dashboard",
  "/iqc-local":            "IQC Local",
  "/user-control":         "Manage User",
  "/user-feedback":        "User Feedback",
  "/activity-log":         "Activity Log",
  "/system-dashboard":     "System Dashboard",
  "/create-user":          "Create User",
};

export const getPageLabel = (path) => {
  if (!path) return "-";
  const key = Object.keys(PAGE_LABELS).find(k => path.startsWith(k));
  return key ? PAGE_LABELS[key] : path;
};

export default PAGE_LABELS;