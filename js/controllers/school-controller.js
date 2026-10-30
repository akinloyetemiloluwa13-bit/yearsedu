const ROLE_AUTH_COPY = {
  student: {
    heading: 'Student portal',
    subtitle: 'Log in or create your student account.',
    helper: 'Use your school account or create a student account.'
  },
  staff: {
    heading: 'Staff / Teacher portal',
    subtitle: 'Enter your school account and admin-issued access code.',
    helper: 'Ask your school administrator for your staff access code.'
  },
  admin: {
    heading: 'Administrator portal',
    subtitle: 'Sign in with your school administrator account.',
    helper: 'Use the email and portal password you set up for this browser preview. This is not your Gmail password.'
  }
};

class SchoolController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.selectedPortalRole = null;
    this.lastScrollY = window.scrollY;
    this.scrollFrame = null;
    this.bindScrollBehavior();
    window.addEventListener('storage', event => {
      if (event.key === 'edunova-accounts-v1') {
        this.model.accounts = this.model.loadAccounts();
        if (this.model.user?.role === 'admin') {
          this.view.renderAdminStaffAccounts();
          this.view.renderAdminStaffCodes();
        }
        return;
      }
      if (event.key !== 'edunova-school-preview-v1') return;

      const previousNotificationIds = new Set((this.model.storage.notifications || []).map(notification => notification.id));
      this.model.storage = this.model.load();
      const user = this.model.user;
      if (!user || !['student', 'staff'].includes(user.role)) return;

      const newNotifications = this.model.notificationsForUser(user)
        .filter(notification => !previousNotificationIds.has(notification.id));
      newNotifications.forEach(notification => {
        this.view.notify(`${notification.title}: ${notification.message}`);
      });
      if (user.role === 'student') {
        this.view.renderClassScheduleNotifications();
        this.view.renderDashboard();
        this.view.renderTimetable();
        this.view.renderAssignments();
      } else {
        this.view.renderStaffNotifications();
      }
    });
  }

  selectPortalRole(role) {
    if (!['student', 'staff', 'admin'].includes(role)) {
      this.view.notify('Choose Student, Staff or Administrator to continue.');
      return;
    }

    this.selectedPortalRole = role;
    this.view.element('roleChooser').classList.add('hidden');
    this.view.element('authPanel').classList.remove('hidden');
    const canSetUpAdmin = role === 'admin' && !this.model.hasAdminAccount();
    this.view.element('studentAuthModes').classList.toggle('hidden', role !== 'student' && !canSetUpAdmin);
    this.view.element('loginStaffCodeGroup').classList.toggle('hidden', role !== 'staff');
    this.view.element('loginNameGroup').classList.add('hidden');
    this.view.element('loginProgramGroup').classList.add('hidden');
    this.view.element('loginDepartmentGroup').classList.add('hidden');
    this.view.element('loginName').required = false;
    this.view.element('loginProgram').required = false;
    this.view.element('loginDepartment').required = false;
    this.view.element('loginStaffCode').required = role === 'staff';
    this.view.element('loginEmail').readOnly = false;

    const labels = ROLE_AUTH_COPY[role];
    this.view.element('loginHeading').textContent = labels.heading;
    this.view.element('loginSubtitle').textContent = labels.subtitle;
    this.view.element('authHelper').textContent = labels.helper;
    if (canSetUpAdmin) {
      this.view.element('loginModeButton').textContent = 'Login';
      this.view.element('signupModeButton').textContent = 'Set up admin';
      this.setAuthMode('adminSetup');
    } else {
      this.view.element('loginModeButton').textContent = 'Login';
      this.view.element('signupModeButton').textContent = 'Create account';
      this.setAuthMode('login');
    }
  }

  backToRoleChooser() {
    this.selectedPortalRole = null;
    this.view.element('authPanel').classList.add('hidden');
    this.view.element('roleChooser').classList.remove('hidden');
    this.view.element('loginPassword').value = '';
    this.view.element('loginStaffCode').value = '';
    this.setAuthMode('login');
  }

  setAuthMode(mode) {
    if (!['login', 'studentSignup', 'adminSetup'].includes(mode)) {
      this.view.notify('Choose Login or Create account.');
      return;
    }
    if (!this.selectedPortalRole) return;
    if (mode === 'studentSignup' && this.selectedPortalRole !== 'student') {
      this.view.notify('Only students can create accounts.');
      return;
    }
    if (mode === 'adminSetup'
      && (this.selectedPortalRole !== 'admin' || this.model.hasAdminAccount())) {
      this.view.notify('Administrator setup is only available before an admin account exists.');
      return;
    }

    const isStudentSignup = mode === 'studentSignup';
    const isAdminSetup = mode === 'adminSetup';
    const isSignup = isStudentSignup || isAdminSetup;
    this.view.element('loginNameGroup').classList.toggle('hidden', !isSignup);
    this.view.element('loginProgramGroup').classList.toggle('hidden', !isStudentSignup);
    this.view.element('loginDepartmentGroup').classList.toggle('hidden', !isStudentSignup);
    this.view.element('loginSubjectsGroup').classList.toggle('hidden', !isStudentSignup);
    this.view.element('loginName').required = isSignup;
    this.view.element('loginNameGroup').querySelector('label').textContent =
      isAdminSetup ? 'Administrator full name' : 'Full Name';
    this.view.element('loginProgram').required = isStudentSignup;
    this.view.element('loginDepartment').required = isStudentSignup;
    this.view.element('loginEmail').readOnly = isAdminSetup;
    if (isAdminSetup) this.view.element('loginEmail').value = 'akinloyetemiloluwa13@gmail.com';
    this.view.element('loginPassword').autocomplete = isSignup ? 'new-password' : 'current-password';
    if (isSignup) this.view.element('loginPassword').minLength = 8;
    else this.view.element('loginPassword').removeAttribute('minlength');
    this.view.element('loginPassword').previousElementSibling.textContent =
      isAdminSetup ? 'Create a portal password (not your Gmail password)' : 'Password';
    const roleHeadings = {
      student: 'Student portal',
      staff: 'Staff / Teacher portal',
      admin: 'Administrator portal'
    };
    this.view.element('loginHeading').textContent = isStudentSignup
      ? 'Create your student account'
      : isAdminSetup ? 'Set up the administrator account' : roleHeadings[this.selectedPortalRole];
    this.view.element('loginSubtitle').textContent = isStudentSignup
      ? 'Choose your exam programme and department to get started.'
      : isAdminSetup
        ? 'Set a portal password for the authorized admin email. This preview does not verify Gmail ownership.'
        : ROLE_AUTH_COPY[this.selectedPortalRole].subtitle;
    this.view.element('authHelper').textContent = isStudentSignup
      ? 'Create a student account to access your school workspace.'
      : isAdminSetup
        ? 'Enter your name and choose a new password of at least 8 characters. This does not sign in to Google; the account is saved only in this browser.'
        : ROLE_AUTH_COPY[this.selectedPortalRole].helper;
    this.view.element('loginModeButton').classList.toggle('active', !isSignup);
    this.view.element('loginModeButton').setAttribute('aria-pressed', String(!isSignup));
    this.view.element('signupModeButton').classList.toggle('active', isSignup);
    this.view.element('signupModeButton').setAttribute('aria-pressed', String(isSignup));
    this.view.element('authSubmitButton').textContent = isStudentSignup
      ? 'Create student account'
      : isAdminSetup ? 'Set up administrator' : 'Login';
    if (isStudentSignup) this.view.renderSignupSubjects();
  }

  login() {
    const role = this.selectedPortalRole;
    if (!role) {
      this.view.notify('Choose your school role first.');
      return;
    }
    const isSignup = this.view.element('signupModeButton').getAttribute('aria-pressed') === 'true';
    const mode = isSignup
      ? (role === 'admin' ? 'adminSetup' : 'studentSignup')
      : 'login';
    const name = this.view.element('loginName').value.trim();
    const email = this.view.element('loginEmail').value.trim().toLowerCase();
    const password = this.view.element('loginPassword').value.trim();
    const staffCode = this.view.element('loginStaffCode').value.trim();
    const examProgram = this.view.element('loginProgram').value;
    const department = this.view.element('loginDepartment').value;
    const subjects = [...document.querySelectorAll('input[name="offeredSubjects"]:checked')]
      .map(input => input.value);

    if (!email || !this.view.element('loginEmail').checkValidity()) {
      this.view.notify('Enter a valid email address to continue.');
      return;
    }
    if (!password) {
      this.view.notify('Enter your password to continue.');
      return;
    }

    if (mode === 'studentSignup' || mode === 'adminSetup') {
      if (!name) {
        this.view.notify('Enter your full name to create your account.');
        return;
      }
      try {
        const account = mode === 'adminSetup'
          ? this.model.registerAdmin({ name, email, password })
          : this.model.registerStudent({ name, email, password, examProgram, department, subjects });
        this.model.user = {
          name: account.name,
          email: account.email,
          role: account.role,
          className: account.className,
          examProgram: account.examProgram,
          department: account.department,
          subjects: account.subjects
        };
      } catch (error) {
        this.view.notify(error.message);
        return;
      }
    } else {
      const account = this.model.loginWithCredentials(email, password, role, staffCode);
      if (!account) {
        this.view.notify(role === 'staff'
          ? 'Incorrect staff email, password or access code. Contact your administrator if you need a code.'
          : 'Incorrect email or password for this portal.');
        return;
      }
      this.model.user = {
        name: account.name,
        email: account.email,
        role: account.role,
        className: account.className,
        examProgram: account.examProgram,
        department: account.department,
        subjects: account.subjects
      };
    }

    const currentUser = this.model.user;
    this.view.showRoleDashboard(currentUser.role);

    if (currentUser.role === 'student') {
      this.view.initializeStudent();
      this.openWorkspace('dashboard');
      this.updateSidebarOffset();
      this.showWorkspaceSidebar();
    } else if (currentUser.role === 'staff') {
      this.view.initializeStaff();
    } else {
      this.view.initializeAdmin();
    }
  }

  logout() {
    this.model.user = null;
    window.location.reload();
  }

  openWorkspace(page) {
    this.view.navigate(page);
    if (window.innerWidth < 700) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  selectTimetableDay(day, button) {
    if (!DAYS.includes(day)) return;
    this.model.selectedDay = day;
    document.querySelectorAll('.day-button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    this.view.element('selectedDayLabel').textContent = day;
    this.view.renderTimetable();
  }

  submitAssignment(event, assignmentId) {
    event.preventDefault();
    const response = new FormData(event.currentTarget).get('response');
    const text = typeof response === 'string' ? response.trim() : '';
    if (!text) {
      this.view.notify('Write your response before submitting.');
      return;
    }
    if (!this.model.submitAssignment(assignmentId, text)) return;
    this.view.renderAssignments();
    this.view.renderDashboard();
    this.view.notify('Assignment submitted in this browser preview.');
  }

  setStudentAttendance(index, status) {
    const student = this.model.staffRoster?.[index];
    if (!student) {
      this.view.notify('That student is no longer in the class roster.');
      return;
    }
    try {
      if (!this.model.markAttendance(student, status)) return;
    } catch (error) {
      this.view.notify(error.message);
      return;
    }
    this.view.notify(`${student.name}'s attendance saved.`);
    this.view.renderStaffRoster();
  }

  createAssignment(event) {
    event.preventDefault();
    const title = this.view.element('newAssignmentTitle').value.trim();
    const subject = this.view.element('newAssignmentSubject').value;
    const dueDate = this.view.element('newAssignmentDue').value;
    const instructions = this.view.element('newAssignmentInstructions').value.trim();
    if (!title || !subject || !dueDate || dueDate < localDateString(new Date())) {
      this.view.notify('Enter a title, subject and due date that is today or later.');
      return;
    }

    const assignment = {
      id: `staff-${Date.now()}`,
      title,
      subject,
      dueDate,
      instructions,
      className: this.model.user.className
    };
    if (!this.model.publishAssignment(assignment)) return;

    event.currentTarget.reset();
    this.view.element('newAssignmentDue').min = localDateString(new Date());
    this.view.updateStaffSummary();
    this.view.notify('Assignment published for this class preview.');
  }

  publishClassSchedule(event) {
    event.preventDefault();
    if (this.model.user?.role !== 'admin') {
      this.view.notify('Only an administrator can schedule a class.');
      return;
    }

    const examProgram = this.view.element('scheduleProgram').value;
    const department = this.view.element('scheduleDepartment').value;
    const subject = this.view.element('scheduleSubject').value.trim();
    const date = this.view.element('scheduleDate').value;
    const start = this.view.element('scheduleStart').value;
    const end = this.view.element('scheduleEnd').value;
    const room = this.view.element('scheduleRoom').value.trim();
    const today = localDateString(new Date());

    if (!['WAEC', 'JAMB'].includes(examProgram) || !['Science', 'Commercial', 'Art'].includes(department)) {
      this.view.notify('Choose a valid exam programme and department.');
      return;
    }
    if (!subject || !date || !start || !end || !room || date < today || end <= start) {
      this.view.notify('Enter the class details, a date today or later, and a valid time range.');
      return;
    }

    const schedule = {
      id: `class-${Date.now()}`,
      examProgram,
      department,
      subject,
      date,
      start,
      end,
      room
    };
    if (!this.model.publishClassSchedule(schedule)) return;

    event.currentTarget.reset();
    this.view.element('scheduleDate').min = today;
    this.view.renderAdminClassSchedules();
    this.view.notify(`Class notification sent to ${examProgram} ${department} students in this browser preview.`);
  }

  issueStaffAccessCode(event) {
    event.preventDefault();
    if (this.model.user?.role !== 'admin') {
      this.view.notify('Only an administrator can issue staff access codes.');
      return;
    }
    try {
      const issued = this.model.issueStaffAccessCode(this.view.element('staffCodeAccount').value);
      this.view.element('issuedStaffCode').textContent = `${issued.name} (${issued.email}) — ${issued.code}`;
      this.view.renderAdminStaffCodes();
      this.view.notify('Staff access code generated. Share it directly with the selected staff member.');
    } catch (error) {
      this.view.notify(error.message);
    }
  }

  createStaffAccount(event) {
    event.preventDefault();
    if (this.model.user?.role !== 'admin') {
      this.view.notify('Only an administrator can create staff accounts.');
      return;
    }
    try {
      this.model.createStaffAccount({
        name: this.view.element('newStaffName').value,
        email: this.view.element('newStaffEmail').value,
        password: this.view.element('newStaffPassword').value,
        className: this.view.element('newStaffClass').value
      });
      event.currentTarget.reset();
      this.view.renderAdminStaffAccounts();
      this.view.renderAdminStaffCodes();
      this.view.notify('Staff account created. Generate an access code and share both sign-in details directly with the staff member.');
    } catch (error) {
      this.view.notify(error.message);
    }
  }

  bindScrollBehavior() {
    const style = document.createElement('style');
    style.textContent = `
      #studentDashboard .workspace-sidebar {
        transition: opacity .22s ease, transform .22s ease, top .16s ease, visibility .22s;
      }
      #studentDashboard .workspace-sidebar.is-scroll-hidden {
        opacity: 0;
        transform: translateY(-8px);
        visibility: hidden;
        pointer-events: none;
      }
      @media (max-width: 700px) {
        #studentDashboard .workspace-sidebar.is-scroll-hidden {
          transform: translateY(-5px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #studentDashboard .workspace-sidebar {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
    window.addEventListener('scroll', () => this.queueScrollUpdate(), { passive: true });
    window.addEventListener('resize', () => this.updateSidebarOffset(), { passive: true });
  }

  queueScrollUpdate() {
    if (this.scrollFrame !== null) return;
    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.handleScroll();
    });
  }

  handleScroll() {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - this.lastScrollY;
    const dashboard = document.getElementById('studentDashboard');
    if (!dashboard || dashboard.classList.contains('hidden')) {
      this.lastScrollY = currentScrollY;
      return;
    }

    this.updateSidebarOffset();
    if (currentScrollY <= 24 || delta < -6) {
      this.showWorkspaceSidebar();
    } else if (delta > 6) {
      this.hideWorkspaceSidebar();
    }
    this.lastScrollY = currentScrollY;
  }

  updateSidebarOffset() {
    const header = document.getElementById('mainHeader');
    const sidebar = document.querySelector('#studentDashboard .workspace-sidebar');
    if (!header || !sidebar || window.innerWidth <= 700) return;
    sidebar.style.top = `${Math.ceil(header.getBoundingClientRect().height + 16)}px`;
  }

  showWorkspaceSidebar() {
    document.querySelector('#studentDashboard .workspace-sidebar')?.classList.remove('is-scroll-hidden');
  }

  hideWorkspaceSidebar() {
    document.querySelector('#studentDashboard .workspace-sidebar')?.classList.add('is-scroll-hidden');
  }
}
