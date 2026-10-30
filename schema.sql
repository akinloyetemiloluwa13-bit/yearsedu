CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255),
  role ENUM('student','staff','admin') DEFAULT 'student',
  class VARCHAR(20),
  student_id VARCHAR(30) UNIQUE NULL,
  trial_ends_at DATETIME NULL,
  is_paid TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL,
  teacher_id INT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE timetable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(20) NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NULL,
  weekday ENUM('Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  room VARCHAR(100),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_class_period (class_name, weekday, starts_at)
);

CREATE TABLE examinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(20) NOT NULL,
  subject_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  exam_date DATE NOT NULL,
  starts_at TIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  venue VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  INDEX idx_examination_class_date (class_name, exam_date)
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject_id INT NULL,
  status ENUM('Present','Absent','Late') DEFAULT 'Present',
  date DATE NOT NULL,
  note VARCHAR(255) NULL,
  marked_by INT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_attendance_user_date (user_id, date)
);

CREATE TABLE assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  class_name VARCHAR(20) NOT NULL,
  teacher_id INT NULL,
  title VARCHAR(200) NOT NULL,
  instructions TEXT,
  due_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_assignment_class_due (class_name, due_at)
);

CREATE TABLE assignment_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_text TEXT NOT NULL,
  status ENUM('submitted','late','graded') DEFAULT 'submitted',
  score DECIMAL(5,2) NULL,
  feedback TEXT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_submission (assignment_id, student_id)
);

CREATE TABLE exam_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  examination_id INT NOT NULL,
  student_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  grade VARCHAR(5),
  published_at DATETIME NULL,
  FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_exam_result (examination_id, student_id)
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  reference VARCHAR(100) UNIQUE,
  amount INT,
  status ENUM('pending','success','failed'),
  paid_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
