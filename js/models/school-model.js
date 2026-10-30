const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEPARTMENT_SUBJECTS = {
  Science: [
    'English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
    'Further Mathematics', 'Agricultural Science', 'Geography', 'Computer Studies',
    'Economics', 'Civic Education', 'Technical Drawing'
  ],
  Commercial: [
    'English Language', 'Mathematics', 'Economics', 'Commerce',
    'Financial Accounting', 'Government', 'Marketing', 'Office Practice',
    'Civic Education', 'Geography', 'Computer Studies'
  ],
  Art: [
    'English Language', 'Mathematics', 'Literature in English', 'Government',
    'History', 'Christian Religious Studies', 'Islamic Religious Studies',
    'Economics', 'Civic Education', 'French', 'Yoruba', 'Music', 'Visual Arts'
  ]
};
const SUBJECTS = [...new Set(Object.values(DEPARTMENT_SUBJECTS).flat())];
const ADMIN_BOOTSTRAP_EMAIL = 'akinloyetemiloluwa13@gmail.com';
const DEMO_ACCOUNT_EMAILS = new Set([
  'admin@edunova.edu',
  'teacher@edunova.edu',
  'math@edunova.edu',
  'ada@edunova.edu'
]);

const STORAGE_KEY = 'edunova-school-preview-v1';
const ACCOUNTS_KEY = 'edunova-accounts-v1';
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  examinations: 'Examinations',
  timetable: 'Timetable',
  attendance: 'Attendance',
  assignments: 'Assignments',
  courses: 'My subjects'
};

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayName(date) {
  const day = date.toLocaleDateString('en', { weekday: 'long' });
  return DAYS.includes(day) ? day : null;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

class SchoolModel {
  constructor() {
    this.user = null;
    this.selectedDay = weekdayName(new Date()) || 'Monday';
    this.accounts = this.loadAccounts();
    this.storage = this.load();
  }

  loadAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return [];

      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) {
        throw new Error('Saved account data is not an array.');
      }
      const accounts = saved.filter(account =>
        !DEMO_ACCOUNT_EMAILS.has(String(account?.email || '').toLowerCase())
      );
      if (accounts.length !== saved.length) {
        try {
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch (error) {
          console.error('Unable to remove built-in demo accounts from browser storage.', error);
        }
      }
      return accounts;
    } catch (error) {
      console.error('Unable to load saved account records.', error);
      return [];
    }
  }

  saveAccounts() {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(this.accounts));
      return true;
    } catch (error) {
      console.error('Unable to save account records.', error);
      return false;
    }
  }

  findAccount(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return this.accounts.find(account => account.email.toLowerCase() === normalizedEmail);
  }

  hasAdminAccount() {
    return this.accounts.some(account => account.role === 'admin');
  }

  registerAdmin({ name, email, password }) {
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    if (this.hasAdminAccount()) {
      throw new Error('An administrator account has already been set up.');
    }
    if (cleanEmail !== ADMIN_BOOTSTRAP_EMAIL) {
      throw new Error(`Use the authorized admin email: ${ADMIN_BOOTSTRAP_EMAIL}.`);
    }
    if (!cleanName || cleanPassword.length < 8) {
      throw new Error('Enter your name and choose a preview password with at least 8 characters.');
    }

    const account = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: 'admin',
      className: 'Administration'
    };
    this.accounts.push(account);
    if (!this.saveAccounts()) {
      this.accounts.pop();
      throw new Error('Your browser could not save the administrator account.');
    }
    return account;
  }

  registerStudent({ name, email, password, examProgram, department, subjects }) {
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    const validPrograms = ['WAEC', 'JAMB'];
    const validDepartments = ['Science', 'Commercial', 'Art'];

    if (!cleanName || !cleanEmail || !cleanPassword) {
      throw new Error('Enter your name, email and password to create your student account.');
    }
    if (!validPrograms.includes(examProgram) || !validDepartments.includes(department)) {
      throw new Error('Choose a valid exam programme and department.');
    }
    const requestedSubjects = Array.isArray(subjects) ? subjects : [];
    const offeredSubjects = [...new Set(
      requestedSubjects.filter(subject => DEPARTMENT_SUBJECTS[department].includes(subject))
    )];
    if (!offeredSubjects.length || offeredSubjects.length !== requestedSubjects.length) {
      throw new Error('Choose at least one valid subject for your department.');
    }
    if (this.accounts.some(account => account.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with that email already exists. Please log in instead.');
    }

    const className = `${examProgram} · ${department}`;
    const account = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: 'student',
      className,
      examProgram,
      department,
      subjects: offeredSubjects
    };

    this.accounts.push(account);
    if (!this.saveAccounts()) {
      this.accounts.pop();
      throw new Error('Your browser could not save the new student account.');
    }
    return account;
  }

  loginWithCredentials(email, password, role, staffCode = '') {
    const account = this.findAccount(email);
    if (!account || account.role !== role) return null;
    if (account.password !== String(password || '').trim()) return null;
    if (role === 'staff' && account.staffAccessCode !== String(staffCode || '').trim().toUpperCase()) return null;
    return account;
  }

  staffAccounts() {
    return this.accounts.filter(account => account.role === 'staff');
  }

  createStaffAccount({ name, email, password, className }) {
    if (this.user?.role !== 'admin') {
      throw new Error('Only an administrator can create staff accounts.');
    }
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    const cleanClassName = String(className || '').trim();
    if (!cleanName || !cleanEmail || !cleanClassName || cleanPassword.length < 8) {
      throw new Error('Enter the staff member’s name, email, class and a password of at least 8 characters.');
    }
    if (this.findAccount(cleanEmail)) {
      throw new Error('An account with that email already exists.');
    }

    const account = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: 'staff',
      className: cleanClassName
    };
    this.accounts.push(account);
    if (!this.saveAccounts()) {
      this.accounts.pop();
      throw new Error('Your browser could not save the staff account.');
    }
    return account;
  }

  subjectsForUser(user = this.user) {
    if (!user || user.role !== 'student') return [];
    const offeredSubjects = Array.isArray(user.subjects) ? user.subjects : [];
    return offeredSubjects.filter(subject => DEPARTMENT_SUBJECTS[user.department]?.includes(subject));
  }

  issueStaffAccessCode(email) {
    const account = this.findAccount(email);
    if (!account || account.role !== 'staff') {
      throw new Error('Choose a valid staff account.');
    }
    if (!window.crypto?.getRandomValues) {
      throw new Error('Secure code generation is unavailable in this browser.');
    }

    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    const code = `EDU-${String(100000 + (random[0] % 900000))}`;
    const previousCode = account.staffAccessCode;
    account.staffAccessCode = code;
    if (!this.saveAccounts()) {
      if (previousCode) account.staffAccessCode = previousCode;
      else delete account.staffAccessCode;
      throw new Error('Your browser could not save the staff access code.');
    }
    return { name: account.name, email: account.email, code };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { assignments: [], attendance: {}, submissions: {}, classSchedules: [], notifications: [] };

      const saved = JSON.parse(raw);
      if (
        !saved
        || !Array.isArray(saved.assignments)
        || !saved.attendance
        || typeof saved.attendance !== 'object'
        || !saved.submissions
        || typeof saved.submissions !== 'object'
      ) {
        throw new Error('Saved school preview data has an unexpected format.');
      }
      if (!Array.isArray(saved.classSchedules)) saved.classSchedules = [];
      if (!Array.isArray(saved.notifications)) saved.notifications = [];
      return saved;
    } catch (error) {
      console.error('Unable to load saved school preview data.', error);
      window.addEventListener('DOMContentLoaded', () => {
        window.schoolController?.view.notify('Saved preview data could not be loaded. A fresh preview is open.');
      }, { once: true });
      return { assignments: [], attendance: {}, submissions: {}, classSchedules: [], notifications: [] };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
      return true;
    } catch (error) {
      console.error('Unable to save school preview data.', error);
      window.schoolController?.view.notify('Your browser could not save this change. Check browser storage settings.');
      return false;
    }
  }

  assignmentsForClass() {
    const className = this.user?.className;
    return this.storage.assignments
      .filter(assignment =>
        assignment.className === className
        || !assignment.className
        || (this.user?.role === 'student' && this.subjectsForUser().includes(assignment.subject))
      )
      .filter(assignment => !this.user?.subjects || this.user.subjects.includes(assignment.subject))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  submissionsForUser() {
    if (!this.user) return {};
    if (!this.storage.submissions[this.user.email]) {
      this.storage.submissions[this.user.email] = {};
    }
    return this.storage.submissions[this.user.email];
  }

  attendanceForUser() {
    if (!this.user) return [];
    const saved = this.storage.attendance[this.user.email] || {};
    return Object.entries(saved).map(([date, status]) => ({
      date,
      status,
      note: status === 'Absent' ? 'Contact the school office if this is incorrect.' : ''
    })).sort((a, b) => b.date.localeCompare(a.date));
  }

  rosterForClass() {
    return this.accounts.filter(student =>
      student.role === 'student' && student.className === this.user?.className
    );
  }

  markAttendance(student, status) {
    if (!['Present', 'Absent', 'Late'].includes(status)) {
      throw new Error('Choose a valid attendance status.');
    }
    const today = localDateString(new Date());
    const previousStatus = this.storage.attendance[student.email]?.[today];
    if (!this.storage.attendance[student.email]) {
      this.storage.attendance[student.email] = {};
    }
    this.storage.attendance[student.email][today] = status;
    if (!this.save()) {
      if (previousStatus) this.storage.attendance[student.email][today] = previousStatus;
      else delete this.storage.attendance[student.email][today];
      return false;
    }
    return true;
  }

  submitAssignment(assignmentId, text) {
    const submissions = this.submissionsForUser();
    const previousSubmission = submissions[assignmentId];
    const assignment = this.assignmentsForClass().find(item => item.id === assignmentId);
    const notificationId = `submission-${this.user.email}-${assignmentId}`;
    const previousNotification = this.storage.notifications.find(notification => notification.id === notificationId);
    submissions[assignmentId] = {
      text,
      submittedAt: localDateString(new Date())
    };
    this.removeNotification(notificationId);
    this.addNotification({
      id: notificationId,
      type: 'submission',
      recipientRole: 'staff',
      title: 'Assignment submitted',
      message: `${this.user.name} submitted ${assignment?.title || 'an assignment'}${assignment ? ` for ${assignment.subject}` : ''}.`
    });
    if (!this.save()) {
      if (previousSubmission) submissions[assignmentId] = previousSubmission;
      else delete submissions[assignmentId];
      this.removeNotification(notificationId);
      if (previousNotification) this.storage.notifications.push(previousNotification);
      return false;
    }
    return true;
  }

  publishAssignment(assignment) {
    this.storage.assignments.push(assignment);
    this.addNotification({
      id: `assignment-${assignment.id}`,
      type: 'assignment',
      recipientRole: 'student',
      subject: assignment.subject,
      title: 'New assignment',
      message: `${assignment.title} is due ${formatDate(assignment.dueDate)}.`
    });
    if (this.save()) return true;
    this.storage.assignments.pop();
    this.removeNotification(`assignment-${assignment.id}`);
    return false;
  }

  addNotification(notification) {
    if (!Array.isArray(this.storage.notifications)) this.storage.notifications = [];
    this.storage.notifications.push({
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString()
    });
  }

  removeNotification(id) {
    this.storage.notifications = this.storage.notifications.filter(notification => notification.id !== id);
  }

  notificationsForUser(user = this.user) {
    if (!user) return [];
    return this.storage.notifications
      .filter(notification => {
        if (notification.recipientRole !== user.role) return false;
        if (notification.recipientEmail && notification.recipientEmail !== user.email) return false;
        if (notification.examProgram && notification.examProgram !== user.examProgram) return false;
        if (notification.department && notification.department !== user.department) return false;
        if (notification.subject && user.role === 'student' && !this.subjectsForUser(user).includes(notification.subject)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  classSchedulesForUser(user = this.user) {
    if (!user || user.role !== 'student') return [];
    return this.storage.classSchedules
      .filter(schedule => schedule.examProgram === user.examProgram && schedule.department === user.department)
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  }

  publishClassSchedule(schedule) {
    this.storage.classSchedules.push(schedule);
    this.addNotification({
      id: `schedule-student-${schedule.id}`,
      type: 'class-schedule',
      recipientRole: 'student',
      examProgram: schedule.examProgram,
      department: schedule.department,
      title: `${schedule.subject} class scheduled`,
      message: `${formatDate(schedule.date)} · ${schedule.start}–${schedule.end} · ${schedule.room}.`
    });
    this.addNotification({
      id: `schedule-staff-${schedule.id}`,
      type: 'class-schedule',
      recipientRole: 'staff',
      title: 'New class scheduled',
      message: `${schedule.subject} for ${schedule.examProgram} ${schedule.department}: ${formatDate(schedule.date)}, ${schedule.start}–${schedule.end} at ${schedule.room}.`
    });
    if (this.save()) return true;
    this.storage.classSchedules.pop();
    this.removeNotification(`schedule-student-${schedule.id}`);
    this.removeNotification(`schedule-staff-${schedule.id}`);
    return false;
  }
}
