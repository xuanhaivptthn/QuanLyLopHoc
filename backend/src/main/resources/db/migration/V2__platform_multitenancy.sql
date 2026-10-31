-- ====================================================
-- Table: organizations (Centers / Schools / Institutions)
-- ====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);

-- ====================================================
-- Table: organization_members (Teacher/Admin membership in Center)
-- ====================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'TEACHER',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ====================================================
-- Table: organization_invitations (Pending teacher invites)
-- ====================================================
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'TEACHER',
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON organization_invitations(organization_id);

-- ====================================================
-- Update users table: Update role check & active workspace
-- ====================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER', 'STUDENT'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ====================================================
-- Update classrooms table: Scoped to organization or solo teacher
-- ====================================================
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_classrooms_organization_id ON classrooms(organization_id);

-- Relax global unique constraint on classroom code to allow same code across different centers/teachers
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_classrooms_org_code ON classrooms(organization_id, code) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_classrooms_teacher_code ON classrooms(teacher_id, code) WHERE organization_id IS NULL;

-- ====================================================
-- Update students table: Scoped to organization/owner and linked to user account
-- ====================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS owner_teacher_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_organization_id ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_owner_teacher_id ON students(owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Relax global unique constraints on student_code and email
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_org_code ON students(organization_id, student_code) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_teacher_code ON students(owner_teacher_id, student_code) WHERE owner_teacher_id IS NOT NULL;
