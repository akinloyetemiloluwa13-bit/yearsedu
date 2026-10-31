class SchoolView {
  constructor(model) {
    this.model = model;
  }

  element(id) {
    const target = document.getElementById(id);
    if (!target) throw new Error(`Required page element "${id}" was not found.`);
    return target;
  }

  notify(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3500);
  }

  showRoleDashboard(role) {
    this.element('loginScreen').classList.add('hidden');
    this.element('mainHeader').style.display = 'flex';
    this.element('studentDashboard').classList.add('hidden');
    this.element('staffDashboard').classList.add('hidden');
    this.element('adminDashboard').classList.add('hidden');
    this.element(`${role}Dashboard`).classList.remove('hidden');
    this.element('headerUser').textContent = `${this.model.user.name} · ${role}`;
  }

  showLogin() {
    this.element('mainHeader').style.display = 'none';
    this.element('studentDashboard').classList.add('hidden');
    this.element('staffDashboard').classList.add('hidden');
    this.element('adminDashboard').classList.add('hidden');
    this.element('loginScreen').classList.remove('hidden');
  }

  initializeStudent() {
    this.element('studentDashboard').classList.add('school-workspace');
    this.element('studentName').textContent = this.model.user.name;
    this.element('studentDeptDisplay').textContent = `${this.model.user.className} · Student`;
    this.element('courseClassLabel').textContent = this.model.user.className;
    this.element('todayLabel').textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric'
    });
    this.renderDashboard();
    this.renderDayPicker();
    this.renderTimetable();
    this.renderExaminations();
    this.renderAttendance();
    this.renderAssignments();
    this.renderCourses();
    this.renderClassScheduleNotifications();
    PastQuestionsController.show(this.model.subjectsForUser());
    TextbooksController.show(this.model.subjectsForUser());
  }

  navigate(page) {
    if (!Object.prototype.hasOwnProperty.call(PAGE_TITLES, page)) {
      console.error(`Unknown workspace page: ${page}`);
      this.notify('That workspace page is not available.');
      return;
    }
    document.querySelectorAll('.workspace-page').forEach(section => section.classList.add('hidden'));
    this.element(`page-${page}`).classList.remove('hidden');
    document.querySelectorAll('.workspace-link').forEach(link => {
      const active = link.dataset.page === page;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    this.element('workspaceTitle').textContent = PAGE_TITLES[page];
  }

  renderDashboard() {
    const assignments = this.model.assignmentsForClass();
    const subjects = this.model.subjectsForUser();
    const submissions = this.model.submissionsForUser();
    const attendance = this.model.attendanceForUser();
    const present = attendance.filter(item => item.status === 'Present' || item.status === 'Late').length;
    const attendancePercentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    const pendingAssignments = assignments.filter(item => !submissions[item.id]).length;

    this.element('subjectCount').textContent = subjects.length;
    this.element('attendanceRate').textContent = `${attendancePercentage}%`;
    this.element('attendanceHint').textContent = `${attendance.length} school days recorded`;
    this.element('upcomingExamCount').textContent = '0';
    this.element('pendingAssignmentCount').textContent = pendingAssignments;
    this.element('assignmentNavCount').textContent = pendingAssignments;

    const today = weekdayName(new Date());
    const scheduledToday = this.model.classSchedulesForUser()
      .filter(schedule => schedule.date === localDateString(new Date()));
    this.element('todaySchedule').innerHTML = today
      ? this.renderScheduleRows(scheduledToday, today)
      : '<div class="empty-state">There are no classes scheduled for today. Enjoy your weekend.</div>';
    this.element('dashboardExams').innerHTML = '<div class="empty-state">No examinations have been scheduled.</div>';
  }

  renderSignupSubjects(selectedSubjects = []) {
    const department = this.element('loginDepartment').value;
    const availableSubjects = DEPARTMENT_SUBJECTS[department] || [];
    this.element('signupSubjectChoices').innerHTML = availableSubjects.map(subject => `
      <label class="subject-choice">
        <input type="checkbox" name="offeredSubjects" value="${escapeHTML(subject)}" ${selectedSubjects.includes(subject) ? 'checked' : ''} onchange="updateSubjectSelectionCount()">
        <span>${escapeHTML(subject)}</span>
      </label>
    `).join('');
    this.updateSubjectSelectionCount();
  }

  updateSubjectSelectionCount() {
    const count = document.querySelectorAll('input[name="offeredSubjects"]:checked').length;
    this.element('signupSubjectCount').textContent = count
      ? `${count} subject${count === 1 ? '' : 's'} selected`
      : 'Select at least one subject';
  }

  renderClassScheduleNotifications() {
    const today = localDateString(new Date());
    const notifications = this.model.notificationsForUser();
    const notifiedScheduleIds = new Set(notifications
      .filter(notification => notification.type === 'class-schedule')
      .map(notification => notification.id.replace('schedule-student-', '')));
    const legacySchedules = this.model.classSchedulesForUser()
      .filter(schedule => schedule.date >= today && !notifiedScheduleIds.has(schedule.id))
      .map(schedule => ({
        title: `${schedule.subject} class scheduled`,
        message: `${formatDate(schedule.date)} · ${schedule.start}–${schedule.end} · ${schedule.room}.`,
        createdAt: `${schedule.date}T${schedule.start}:00`
      }));
    this.renderNotificationList('classScheduleNotifications', [...notifications, ...legacySchedules]);
  }

  renderStaffNotifications() {
    this.renderNotificationList('staffNotifications', this.model.notificationsForUser());
  }

  renderNotificationList(elementId, notifications) {
    const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.element(elementId).innerHTML = sorted.length
      ? sorted.map(notification => `
        <article class="class-notification">
          <div class="class-notification-heading">
            <strong>${escapeHTML(notification.title)}</strong>
            <time>${new Date(notification.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
          </div>
          <p>${escapeHTML(notification.message)}</p>
        </article>
      `).join('')
      : '<div class="empty-state">You have no notifications yet.</div>';
  }

  renderAdminClassSchedules() {
    const schedules = [...this.model.storage.classSchedules]
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
    this.element('adminClassScheduleList').innerHTML = schedules.length
      ? schedules.map(schedule => `
        <div class="simple-row">
          <div><strong>${escapeHTML(schedule.subject)} · ${escapeHTML(schedule.examProgram)} ${escapeHTML(schedule.department)}</strong>
          <small>${formatDate(schedule.date)} · ${escapeHTML(schedule.start)}–${escapeHTML(schedule.end)} · ${escapeHTML(schedule.room)}</small></div>
        </div>
      `).join('')
      : '<div class="empty-state">No class sessions have been published yet.</div>';
  }

  renderScheduleRows(lessons, day = this.model.selectedDay) {
    if (!lessons?.length) return '<div class="empty-state">No classes are scheduled for this day.</div>';
    const isToday = weekdayName(new Date()) === day;
    const now = new Date().toTimeString().slice(0, 5);
    return lessons.map(lesson => `
      <div class="schedule-row">
        <div class="schedule-time">${lesson.start}<br><span style="color:var(--muted);font-weight:500">${lesson.end}</span></div>
        <div><div class="schedule-subject">${escapeHTML(lesson.subject)}</div><div class="schedule-room">${escapeHTML(lesson.room)}</div></div>
        <span class="subject-tag">${!isToday ? 'Scheduled' : lesson.start < now ? 'Completed' : 'Upcoming'}</span>
      </div>
    `).join('');
  }

  renderDayPicker() {
    this.element('dayPicker').innerHTML = DAYS.map(day => `
      <button class="day-button ${this.model.selectedDay === day ? 'active' : ''}" onclick="selectTimetableDay('${day}', this)">${day.slice(0, 3)}</button>
    `).join('');
    this.element('selectedDayLabel').textContent = this.model.selectedDay;
  }

  renderTimetable() {
    const today = localDateString(new Date());
    const publishedClasses = this.model.classSchedulesForUser().filter(schedule =>
      schedule.date >= today
      && new Date(`${schedule.date}T12:00:00`).toLocaleDateString('en', { weekday: 'long' }) === this.model.selectedDay
    );
    this.element('timetableDay').innerHTML = publishedClasses.length
      ? publishedClasses.map(schedule => `
        <div class="schedule-row">
          <div class="schedule-time">${escapeHTML(schedule.start)}<br><span style="color:var(--muted);font-weight:500">${escapeHTML(schedule.end)}</span></div>
          <div><div class="schedule-subject">${escapeHTML(schedule.subject)}</div><div class="schedule-room">${escapeHTML(schedule.room)} · ${formatDate(schedule.date)}</div></div>
          <span class="subject-tag">Admin schedule</span>
        </div>
      `).join('')
      : this.renderScheduleRows([]);
  }

  renderExaminations() {
    this.element('examinationRows').innerHTML =
      '<tr><td colspan="6" class="empty-state">No examinations have been scheduled.</td></tr>';
  }

  renderAttendance() {
    const records = this.model.attendanceForUser();
    this.element('presentCount').textContent = records.filter(record => record.status === 'Present').length;
    this.element('absentCount').textContent = records.filter(record => record.status === 'Absent').length;
    this.element('lateCount').textContent = records.filter(record => record.status === 'Late').length;
    this.element('attendanceRows').innerHTML = records.length ? records.map(record => {
      const statusClass = record.status.toLowerCase();
      const date = new Date(`${record.date}T12:00:00`);
      const day = date.toLocaleDateString(undefined, { weekday: 'long' });
      return `<tr><td>${formatDate(record.date)}</td><td>${day}</td><td>${escapeHTML(this.model.user.className)}</td><td><span class="table-status ${statusClass}">${escapeHTML(record.status)}</span></td><td>${escapeHTML(record.note)}</td></tr>`;
    }).join('') : '<tr><td colspan="5" class="empty-state">No attendance has been recorded.</td></tr>';
  }

  renderAssignments() {
    const filter = this.element('assignmentFilter').value;
    const submissions = this.model.submissionsForUser();
    const assignments = this.model.assignmentsForClass().filter(assignment => {
      if (filter === 'pending') return !submissions[assignment.id];
      if (filter === 'submitted') return Boolean(submissions[assignment.id]);
      return true;
    });

    this.element('assignmentList').innerHTML = assignments.map(assignment => {
      const submission = submissions[assignment.id];
      const overdue = assignment.dueDate < localDateString(new Date());
      const badgeClass = submission ? 'badge-green' : overdue ? 'badge-red' : 'badge-gold';
      const badgeText = submission ? 'Submitted' : overdue ? 'Overdue' : 'To do';
      const submissionContent = submission
        ? `<p class="assignment-instructions">Your response: ${escapeHTML(submission.text)}<br>Submitted ${formatDate(submission.submittedAt)}</p>`
        : `<form class="assignment-submit" onsubmit="submitAssignment(event, '${escapeHTML(assignment.id)}')"><textarea name="response" required maxlength="2000" placeholder="Write your response here..." aria-label="Response for ${escapeHTML(assignment.title)}"></textarea><button type="submit">Submit assignment</button></form>`;
      return `
        <article class="assignment-card">
          <div>
            <h3>${escapeHTML(assignment.title)}</h3>
            <div class="assignment-meta">${escapeHTML(assignment.subject)} · Due ${formatDate(assignment.dueDate)}</div>
            <p class="assignment-instructions">${escapeHTML(assignment.instructions || 'Complete and submit this assignment by the due date.')}</p>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
          ${submissionContent}
        </article>
      `;
    }).join('') || '<div class="empty-state">There are no assignments in this view.</div>';
  }

  renderCourses() {
    const selectedSubjects = this.model.subjectsForUser();
    const courses = selectedSubjects.map(name => ({
      code: name.split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase(),
      name,
      description: 'Subject details have not been added.'
    }));
    this.element('courseGrid').innerHTML = courses.map(subject => `
      <article class="course-card">
        <span class="course-code">${escapeHTML(subject.code)}</span>
        <h3>${escapeHTML(subject.name)}</h3>
        <p>${escapeHTML(subject.description)}</p>
      </article>
    `).join('') || '<div class="empty-state">No subjects have been selected for this account.</div>';
  }

  initializeStaff() {
    this.element('staffName').textContent = this.model.user.name;
    this.element('staffDeptDisplay').textContent = `${this.model.user.className} · Teaching staff`;
    this.element('staffToday').textContent = formatDate(localDateString(new Date()));
    this.element('newAssignmentSubject').innerHTML = SUBJECTS.map(subject =>
      `<option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>`
    ).join('');
    this.element('newAssignmentDue').min = localDateString(new Date());
    this.renderStaffRoster();
    this.updateStaffSummary();
    this.renderStaffNotifications();
  }

  initializeAdmin() {
    this.element('adminName').textContent = this.model.user.name;
    this.element('scheduleDate').min = localDateString(new Date());
    this.renderAdminStaffAccounts();
    this.renderAdminClassSchedules();
    this.renderAdminStaffCodes();
  }

  renderAdminStaffAccounts() {
    this.element('staffCodeAccount').innerHTML = this.model.staffAccounts().map(account =>
      `<option value="${escapeHTML(account.email)}">${escapeHTML(account.name)} · ${escapeHTML(account.email)}</option>`
    ).join('');
    if (!this.model.staffAccounts().length) {
      this.element('staffCodeAccount').innerHTML = '<option value="">No staff accounts are available</option>';
      this.element('staffCodeAccount').disabled = true;
    } else {
      this.element('staffCodeAccount').disabled = false;
    }
  }

  renderAdminStaffCodes() {
    const accounts = this.model.staffAccounts();
    this.element('adminStaffCodeList').innerHTML = accounts.length
      ? accounts.map(account => `
        <div class="simple-row">
          <div><strong>${escapeHTML(account.name)}</strong><small>${escapeHTML(account.email)}</small></div>
          <span class="badge ${account.staffAccessCode ? 'badge-green' : 'badge-gold'}">${account.staffAccessCode ? 'Code issued' : 'No code yet'}</span>
        </div>
      `).join('')
      : '<div class="empty-state">Create a staff account before issuing an access code.</div>';
  }

  renderStaffRoster() {
    const roster = this.model.rosterForClass();
    const today = localDateString(new Date());
    this.element('staffRosterRows').innerHTML = roster.length ? roster.map((student, index) => {
      const savedStatus = this.model.storage.attendance[student.email]?.[today] || '';
      const options = ['Present', 'Absent', 'Late'].map(status =>
        `<option value="${status}" ${savedStatus === status ? 'selected' : ''}>${status}</option>`
      ).join('');
      return `<tr><td>${escapeHTML(student.name)}</td><td>${escapeHTML(student.className)}</td><td><select aria-label="Attendance for ${escapeHTML(student.name)}" onchange="setStudentAttendance(${index}, this.value)"><option value="">Not marked</option>${options}</select></td></tr>`;
    }).join('') : '<tr><td colspan="3" class="empty-state">No students are assigned to your class yet.</td></tr>';
    this.model.staffRoster = roster;
    this.element('staffRosterCount').textContent = roster.length;
  }

  updateStaffSummary() {
    this.element('staffAssignmentCount').textContent = this.model.assignmentsForClass().length;
  }
}

/* ---------- Past Questions view ---------- */
const PastQuestionsView = {
  // Elements are looked up in init(), so this file can load before the page is ready.
  init() {
    this.examSelect = document.getElementById("pqExam");
    this.subjectSelect = document.getElementById("pqSubject");
    this.yearSelect = document.getElementById("pqYear");
    this.list = document.getElementById("pqList");
  },

  resetSelect(select, label) {
    select.innerHTML = "";
    select.add(new Option(label, ""));
  },

  renderFilters(subjects, years) {
    this.examSelect.value = "";
    this.resetSelect(this.subjectSelect, "All subjects");
    this.resetSelect(this.yearSelect, "All years");
    subjects.forEach(s => this.subjectSelect.add(new Option(s, s)));
    years.forEach(y => this.yearSelect.add(new Option(y, y)));
  },

  renderPapers(papers, hasAnyPapers) {
    this.list.innerHTML = "";

    if (papers.length === 0) {
      const empty = document.createElement("p");
      empty.className = "pq-empty";
      empty.textContent = hasAnyPapers
        ? "No papers match your selection."
        : "No past-question papers have been added yet.";
      this.list.append(empty);
      return;
    }

    papers.forEach(p => {
      const card = document.createElement("div");
      card.className = "pq-card";

      const title = document.createElement("h3");
      title.textContent = p.subject;

      const meta = document.createElement("p");
      meta.textContent = `${p.exam} · ${p.year}`;

      const link = document.createElement("a");
      link.href = p.file;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open paper";

      card.append(title, meta, link);
      this.list.append(card);
    });
  },

  // The view only reports that something changed; it doesn't decide what to do.
  onFilterChange(handler) {
    this.examSelect.addEventListener("change", e => handler("exam", e.target.value));
    this.subjectSelect.addEventListener("change", e => handler("subject", e.target.value));
    this.yearSelect.addEventListener("change", e => handler("year", e.target.value));
  },
};

/* ---------- Textbooks view ---------- */
const TextbooksView = {
  init() {
    this.subjectSelect = document.getElementById("tbSubject");
    this.list = document.getElementById("tbList");
  },

  renderFilters(subjects) {
    this.subjectSelect.innerHTML = "";
    this.subjectSelect.add(new Option("All subjects", ""));
    subjects.forEach(s => this.subjectSelect.add(new Option(s, s)));
  },

  // groups = [{ subject, books: [...] }], one per registered subject
  renderGroups(groups) {
    this.list.innerHTML = "";
    this.list.style.display = "block";

    if (groups.length === 0) {
      const empty = document.createElement("p");
      empty.className = "pq-empty";
      empty.textContent = "You have not registered for any subjects yet.";
      this.list.append(empty);
      return;
    }

    groups.forEach(group => {
      const section = document.createElement("section");
      section.style.marginBottom = "1.25rem";

      const heading = document.createElement("h3");
      heading.textContent = group.subject;
      heading.style.margin = "0 0 .6rem";

      section.append(heading);

      if (group.books.length === 0) {
        const none = document.createElement("p");
        none.className = "pq-empty";
        none.textContent = "No textbook has been added for this subject yet.";
        section.append(none);
      } else {
        const grid = document.createElement("div");
        grid.className = "pq-list";

        group.books.forEach(b => {
          const card = document.createElement("div");
          card.className = "pq-card";

          const title = document.createElement("h3");
          title.textContent = b.title;

          const meta = document.createElement("p");
          meta.textContent = b.author || group.subject;

          const link = document.createElement("a");
          link.href = b.file;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = "Open textbook";

          card.append(title, meta, link);
          grid.append(card);
        });
        section.append(grid);
      }

      this.list.append(section);
    });
  },

  onSubjectChange(handler) {
    this.subjectSelect.addEventListener("change", e => handler(e.target.value));
  },
};