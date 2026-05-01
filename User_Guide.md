# 🏛️ COCS: User & Operations Manual
**Campus Operations Control System**

Welcome to the official guide for COCS. This application is designed to streamline campus maintenance, security, and administrative oversight through a real-time, accountability-driven workflow.

---

## 👥 Roles & Access Levels
*   **Admin (Dean/Super User)**: Full oversight, Audit authority, Verification control, and Data Archival.
*   **Manager (Worker/Supervisor)**: Task execution, Incident reporting, and Task claiming.

---

## 👷 Manager (Worker) Functions

### 1. Manager Dashboard
*   **Purpose**: Your central command for daily operations.
*   **Key Features**:
    *   **Stat Rows**: Quick view of your Pending, Rejected, and Active tasks.
    *   **Quick Actions**: Large buttons to quickly Submit Work or Report an Issue.

### 2. Manager Claim (Task Pool)
*   **Purpose**: A marketplace for tasks assigned by the Admin.
*   **How to use**:
    *   Navigate to the **Manager Claim** tab.
    *   **Task Pool**: View "OPEN" tasks posted by the Admin. Click **"Manager Claim"** to take ownership.
    *   **My Claims**: Once claimed, the task moves here. When the physical work is done, click **"Finish & Submit"** to send it to the Admin for verification.

### 3. Work Submission
*   **Purpose**: Reporting routine operations (e.g., Cleaning, IT Support, Maintenance).
*   **How to use**: Select Location -> Select Work Type -> Attach **Photo Evidence** -> Add Notes -> Submit.
*   **Note**: If an Admin rejects your work, it will appear in your history with a red border. Click **"Fix & Resubmit"** to correct it.

### 4. Report New Issue (Incidents)
*   **Purpose**: Reporting broken equipment, water leaks, or safety hazards.
*   **Severity & SLA**:
    *   **High**: Resolution required in **2 hours** (Photo evidence is mandatory).
    *   **Medium**: Resolution in **6 hours**.
    *   **Low**: Resolution in **24 hours**.

---

## 🎓 Admin (Dean) Functions

### 1. Admin Dashboard
*   **Purpose**: High-level campus health overview.
*   **Features**: Real-time stats on pending reviews, open issues, and SLA violations.

### 2. Compliance Review (Verify Work)
*   **Purpose**: The "Quality Gate" of the campus.
*   **How to use**:
    *   Review submitted photos and notes from Managers.
    *   **Approve**: Closes the task and logs it as successful.
    *   **Reject**: Sends the task back to the Manager with a specific comment (e.g., "Incomplete work, please check again").

### 3. Audit System
*   **Purpose**: Official scoring and inspection of campus locations.
*   **How to use**: Select Location -> Enter Detailed Findings -> Assign **Performance Score (0-100)**.
*   **Visual Indicator**: Scores are color-coded (Green for 80+, Yellow for 50+, Red for below 50).

### 4. Data Archival (Backup & Optimization)
*   **Purpose**: Long-term data preservation and storage optimization.
*   **The Safety Workflow**:
    1.  **Generate Full Backup**: Packages all data older than 30 days and all photos into a structured ZIP.
    2.  **Download**: Click the download icon. The system will only allow deletion after this step.
    3.  **Optimize (Trash Icon)**: Permanently removes the archived records and photos from the database/storage to free up space.

---

## 🛠️ Global Features
*   **Activity Logs**: Every action (Claim, Submit, Approve, Audit) is recorded for full auditability.
*   **Notifications**: Managers receive instant alerts when their work is Approved or Rejected.
*   **Responsive Design**: The app is fully optimized for mobile use during physical rounds.

---

## 🛡️ Security & Integrity
*   **RLS Protected**: Data is secured at the database level. Managers can only see tasks relevant to them.
*   **Evidence-Based**: High-priority items and work claims require photo evidence to ensure validity.
