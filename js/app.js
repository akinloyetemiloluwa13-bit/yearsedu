const schoolModel = new SchoolModel();
const schoolView = new SchoolView(schoolModel);
const schoolController = new SchoolController(schoolModel, schoolView);
window.schoolController = schoolController;

window.selectPortalRole = role => schoolController.selectPortalRole(role);
window.backToRoleChooser = () => schoolController.backToRoleChooser();
window.setAuthMode = mode => schoolController.setAuthMode(mode);
window.renderSignupSubjects = () => schoolView.renderSignupSubjects();
window.updateSubjectSelectionCount = () => schoolView.updateSubjectSelectionCount();
window.handleLogin = () => schoolController.login();
window.logout = () => schoolController.logout();
window.openWorkspace = page => schoolController.openWorkspace(page);
window.selectTimetableDay = (day, button) => schoolController.selectTimetableDay(day, button);
window.setStudentAttendance = (index, status) => schoolController.setStudentAttendance(index, status);
window.submitAssignment = (event, assignmentId) => schoolController.submitAssignment(event, assignmentId);
window.createAssignment = event => schoolController.createAssignment(event);
window.publishClassSchedule = event => schoolController.publishClassSchedule(event);
window.createStaffAccount = event => schoolController.createStaffAccount(event);
window.issueStaffAccessCode = event => schoolController.issueStaffAccessCode(event);
window.renderExaminations = () => schoolView.renderExaminations();
window.renderAssignments = () => schoolView.renderAssignments();
window.toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch (error) {
    console.error('Unable to save the selected theme.', error);
  }
};

try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch (error) {
  console.error('Unable to load the saved theme.', error);
}
