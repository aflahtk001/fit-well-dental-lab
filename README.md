# Fit Well Dental Lab Desktop Billing Software

A fully offline Windows desktop application built with Electron, React, Vite, Tailwind CSS, and bundled SQLite (`better-sqlite3`), designed with Apple DNA and a left-aligned sidebar.

---

## Features & Pages

### 1. Navigation Pages
1. **Receipt Filling Page**
   - **Receipt Information**: Bill Number, Date, Job Number
   - **Doctor & Clinic Details**: Doctor's Name (dropdown), Clinic Name (dropdown)
   - **Patient & Work Details**: Patient Name, Work Item, Teeth Number, Unit, Rate (Rs.), Amount (Rs.)
   - **Original Dentist Tooth Chart (Palmer Grid Notation)**:
     - Interactive visual chart matching the traditional cross-grid layout:
       - Upper Right (UR): 8 to 1
       - Upper Left (UL): 1 to 8
       - Lower Right (LR): 8 to 1
       - Lower Left (LL): 1 to 8
     - Clicking any tooth number circles it (exact replica of the pen-circled method).
     - Multi-tooth selection with auto-calculated Unit count.
   - Multiple work item rows with auto-calculation: `Amount = Unit × Rate`
   - **Payment Details**: Total Amount (auto-calculated sum of all rows), Signature
   - **Receipt Actions**: Save receipt locally, Print receipt to any connected printer, New receipt / clear
   - **Edit Mode**: Update existing saved receipts directly from the form
2. **Saved Receipts Page**
   - Dedicated full page displaying all locally stored receipts in SQLite
   - **Search & Filters**: Search in real time by Bill #, Patient Name, Job #, Doctor, or Clinic
   - Filter dropdowns for Doctor and Clinic
   - Summary metric cards: Total Saved Receipts, Showing (Filtered), Filtered Total Amount (Rs.)
   - **Actions per Receipt**: View/Print, Edit in Form, Delete
3. **Doctors Page**
   - Add new doctor (only Doctor Name field)
   - Stored in local SQLite database
   - Instantly available in Receipt Doctor dropdown
4. **Clinics Page**
   - Add new clinic (only Clinic Name field)
   - Stored in local SQLite database
   - Instantly available in Receipt Clinic dropdown
5. **Monthly Report Page**
   - Filter by **Doctor** or by **Clinic**
   - Select Month and Year
   - Detailed billing statement breakdown: Bill No., Date, Job No., Patient Name, Clinic/Doctor, Work Items breakdown, Amounts, and Grand Total
   - **Download CSV**: Saves clean structured CSV file with all item details and totals
   - **Print / Save as PDF**: Print-ready statement with summary cards, table, and signature block

### 2. Local Database & Complete Offline Operation
- Uses SQLite bundled via `better-sqlite3`.
- Database file is automatically created on first launch in Electron's `userData` directory:
  `%APPDATA%\dental-lab-billing\dental_lab.db`
- Data persists across application restarts and reboots.
- 100% offline — zero cloud, zero external servers, and zero internet connection needed.

### 3. Packaged Windows Executable & Installer
- Generated standalone NSIS Windows Installer:
  `release/Dental Lab Billing Software Setup 1.0.0.exe`
- Unpacked standalone executable:
  `release/win-unpacked/Dental Lab Billing Software.exe`
- Bundles SQLite and all dependencies — end user does not need to install Node.js, SQLite, or database engines.

---

## Development & Build Commands

- **Run in Development Mode**:
  ```bash
  npm run dev
  ```
- **Build Frontend**:
  ```bash
  npm run build
  ```
- **Package Windows Installer**:
  ```bash
  npm run package
  ```
