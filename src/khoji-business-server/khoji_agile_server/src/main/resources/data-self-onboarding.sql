-- Set search path to khoji
SET search_path TO khoji;


INSERT INTO roles (id, code, name) VALUES
(1, 'TM', 'Team Member (default)'),
(2, 'PO', 'Product Owner'),
(3, 'PM', 'Project Manager'),
(4, 'DEV', 'Developer'),
(5, 'BA', 'Business Analyst'),
(6, 'QAE', 'Quality Assurance Engineer'),
(7, 'NA', 'Network Administrator'),
(8, 'SM', 'Scrum Master'),
(9, 'TL', 'Team Lead'),
(10, 'SA', 'Solution Architect'),
(11, 'UID', 'UI/UX Designer'),
(12, 'DA', 'Data Scientist'),
(13, 'DE', 'Data Engineer'),
(14, 'RES', 'Researcher'),
(15, 'HRP', 'HR Personnel'),
(16, 'TAS', 'Talent Acquisition Specialist'),
(17, 'OWN', 'Owner'),
(18, 'CS', 'C-Suite'),
(19, 'VP', 'Vice President'),
(20, 'DIR', 'Director'),
(21, 'PROM', 'Program Manager'),
(22, 'AT', 'Automation Tester');


INSERT INTO access_level (id, level_code, description, parent_code) VALUES
(1, 'TENANT_ADMIN', 'Has the ability to manage subscription, billing, user access, and project source integration.', NULL),
(2, 'ADMIN', 'Has the ability to manage teams and organizational settings.', 'TENANT_ADMIN'),
(3, 'USER', 'Has view-only access.', 'ADMIN');

INSERT INTO feature (id, feature_name) VALUES
(1, 'Log my work'),
(2, 'Send work log reminder'),
(3, 'Work Log Categorization');
