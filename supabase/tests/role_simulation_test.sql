-- Role-simulation test for all three portals. Paste into the Supabase SQL Editor and run.
-- It creates throwaway users/classes, acts as admin/teacher/student under RLS, and ENDS WITH
-- AN ERROR ON PURPOSE ("ITEST_REPORT pass=N fail=M ...") so every change is rolled back.
-- Regenerate with: node build_role_simulation_test.cjs (writes itest.sql next to it).

do $T$
declare
  report text := ''; ok int := 0; fail int := 0; goto_next boolean := false;
  v_admin uuid := gen_random_uuid(); v_teacher uuid := gen_random_uuid(); v_teacher2 uuid := gen_random_uuid();
  v_student uuid := gen_random_uuid(); v_student2 uuid := gen_random_uuid();
  v_college uuid; v_dept uuid; v_class uuid; v_class2 uuid; v_batch uuid;
  v_ass uuid; v_q1 uuid; v_q2 uuid; v_opt_ok uuid; v_opt_bad uuid; v_cp uuid; v_note uuid; v_lc uuid; v_ann uuid;
  v_tmp uuid; v_ext uuid; v_cnt int; v_code text; v_json jsonb;
begin
  -- ===== fixtures (as postgres; rolled back at the end) =====
  insert into colleges(name, code) values ('ZZ Test College', 'ZZT-'||substr(md5(random()::text),1,6)) returning id into v_college;
  insert into departments(college_id, name, code) values (v_college, 'ZZ Dept', 'ZZD') returning id into v_dept;
  insert into allowed_emails(email, role, full_name, status) values
    ('zz-admin@test.invalid', 'admin', 'ZZ Admin', 'active'),
    ('zz-teacher@test.invalid', 'teacher', 'ZZ Teacher', 'active'),
    ('zz-teacher2@test.invalid', 'teacher', 'ZZ Teacher Two', 'active');
  insert into student_email_roster(college_id, college_name, email, status) values
    (v_college, 'ZZ Test College', 'zz-student@test.invalid', 'active'),
    (v_college, 'ZZ Test College', 'zz-student2@test.invalid', 'active');
  insert into auth.users(id, email, raw_user_meta_data, email_confirmed_at, aud, role) values
    (v_admin, 'zz-admin@test.invalid', '{"full_name":"ZZ Admin"}', now(), 'authenticated', 'authenticated'),
    (v_teacher, 'zz-teacher@test.invalid', '{"full_name":"ZZ Teacher","role":"admin"}', now(), 'authenticated', 'authenticated'),
    (v_teacher2, 'zz-teacher2@test.invalid', '{"full_name":"ZZ Teacher Two"}', now(), 'authenticated', 'authenticated'),
    (v_student, 'zz-student@test.invalid', '{"full_name":"ZZ Student"}', now(), 'authenticated', 'authenticated'),
    (v_student2, 'zz-student2@test.invalid', '{"full_name":"ZZ Student Two"}', now(), 'authenticated', 'authenticated');
  if (select role from profiles where id = v_teacher) <> 'student' then
    report := report || E'\nFAIL F00 signup trigger trusted client role metadata'; fail := fail + 1;
  else
    report := report || E'\nPASS F00 signup trigger ignores client role metadata'; ok := ok + 1;
  end if;
  update profiles set role = 'admin' where id = v_admin;
  update profiles set role = 'teacher' where id = v_teacher;
  insert into teacher_profiles(user_id, department, designation, status) values (v_teacher, 'ZZ Dept', 'Professor', 'active');
  insert into classes(name, department, batch, section, academic_year, teacher_id) values ('ZZ Class', 'ZZ Dept', 'ZZ Batch', 'A', '2026-2027', v_teacher) returning id into v_class;
  insert into classes(name, department, batch, section, academic_year) values ('ZZ Class 2', 'ZZ Dept', 'ZZ Batch', 'B', '2026-2027') returning id into v_class2;
  insert into teacher_assignments(class_id, teacher_id, subject) values (v_class, v_teacher, 'ZZ Subject');
  insert into class_memberships(class_id, student_id) values (v_class, v_student);

  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into colleges(name, code, status) values ('ZZ College 2', 'ZZC2-'||substr(md5(random()::text),1,6), 'Active') returning id into v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A01 [admin] create college: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A01 [admin] create college';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into departments(college_id, name, code) values (v_tmp, 'ZZ CSE', 'ZZCSE');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A02 [admin] create departments for college: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A02 [admin] create departments for college';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into batches(name, code, department, course_name, start_date, end_date) values ('ZZ Batch', 'ZZB-'||substr(md5(random()::text),1,6), 'ZZ Dept', 'B.Tech', '2026-06-01', '2030-05-31') returning id into v_batch;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A03 [admin] create batch: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A03 [admin] create batch';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into subjects(name, code, department, credits) values ('ZZ Subject', 'ZZS-'||substr(md5(random()::text),1,6), 'ZZ Dept', 4);
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A04 [admin] create subject: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A04 [admin] create subject';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into student_email_roster(college_id, college_name, email, student_name, student_id, department, source_file_name, status) values (v_college, 'ZZ Test College', 'zz-extra@test.invalid', 'Extra', null, null, 'Manual Entry', 'active') returning id into v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A05 [admin] add student roster emails: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A05 [admin] add student roster emails';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into announcements(title, content, sender_name, target_role, priority) values ('ZZ Admin Notice', 'Hello all', 'Administrator', 'all', 'Normal') returning id into v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A06 [admin] create announcement (all): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A06 [admin] create announcement (all)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into live_classes(id, title, teacher_id, teacher_name, subject, topic, platform, meeting_url, date, scheduled_date, start_time, end_time, status) values (gen_random_uuid(), 'ZZ Admin Live', v_teacher, 'ZZ Teacher', 'ZZ Subject', 'ZZ Admin Live', 'Google Meet', '', current_date, current_date, '10:00', '11:00', 'Upcoming');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A07 [admin] schedule live class: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A07 [admin] schedule live class';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into assessments(title, batch_id, type, duration_minutes, max_marks, total_marks, passing_marks, start_time, start_date, end_date, status, created_by) values ('ZZ Exam', v_batch, 'MCQ', 120, 100, 100, 40, '10:00', now(), now() + interval '3 hours', 'scheduled', v_admin) returning id into v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A08 [admin] create exam (assessment): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A08 [admin] create exam (assessment)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      update assessments set title = 'ZZ Exam 2', max_marks = 100, passing_marks = 40, duration_minutes = 90, status = 'scheduled' where id = v_tmp;
      reset role;
      if not ((select duration_seconds from assessments where id = v_tmp) = 5400) then raise exception 'post-check failed: %', $q$(select duration_seconds from assessments where id = v_tmp) = 5400$q$; end if;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A09 [admin] update exam: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A09 [admin] update exam';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into admissions(id, application_id, full_name, email, phone, gender, course_name, qualification, address, status, notes) values (gen_random_uuid(), 'APP-ZZ1', 'ZZ Applicant', 'zz-app@test.invalid', '999', 'Male', 'B.Tech', '12th', 'Addr', 'pending', null) returning id into v_tmp; update admissions set status = 'approved', reviewed_by = v_admin, reviewer_notes = 'ok' where id = v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A10 [admin] create + review admission: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A10 [admin] create + review admission';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into teacher_applications(id, application_number, full_name, email, phone, department, qualification, experience_years, requested_subject, skills, cover_letter, portfolio_url, status) values (gen_random_uuid(), 'TAPP-ZZ1', 'ZZ Applicant T', 'zz-tapp@test.invalid', '999', 'ZZ Dept', 'M.Tech', 3, 'ZZ Subject', '{}', null, null, 'pending') returning id into v_tmp; update teacher_applications set status = 'approved', reviewer_notes = 'ok' where id = v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A11 [admin] create + review teacher application: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A11 [admin] create + review teacher application';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into teacher_attendance(teacher_id, date, status, remarks, recorded_by) values (v_teacher, current_date, 'present', null, null) returning id into v_tmp; update teacher_attendance set status = 'late', remarks = 'traffic' where id = v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A12 [admin] record + correct teacher attendance: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A12 [admin] record + correct teacher attendance';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into teacher_leave_requests(teacher_id, teacher_name, total_days, leave_type, from_date, to_date, reason, status) values (v_teacher, 'ZZ Teacher', 2, 'Casual Leave', current_date, current_date + 1, 'Family', 'pending');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A13 [admin] create teacher leave request: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A13 [admin] create teacher leave request';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into fee_records(id, invoice_number, student_id, course_name, fee_plan, total_amount, paid_amount, due_date, status) values (gen_random_uuid(), 'INV-ZZ1', v_student2, 'B.Tech', 'Annual', 50000, 0, current_date + 30, 'pending') returning id into v_tmp; update fee_records set paid_amount = 10000, status = 'partial', last_payment_date = current_date where id = v_tmp; insert into payment_transactions(id, receipt_number, student_id, fee_record_id, amount, payment_date, payment_method, transaction_reference, remarks, status) values (gen_random_uuid(), 'RCPT-ZZ1', v_student2, v_tmp, 10000, current_date, 'UPI', 'TXN1', null, 'successful');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A14 [admin] create fee record + payment: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A14 [admin] create fee record + payment';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into student_profiles(user_id, register_number, roll_number, admission_number, dob, gender, guardian_name, guardian_phone, guardian_email, address, phone, department, course_name, specialization, batch_name, section, academic_year, college_name, admission_date, status) values (v_student2, 'ZZREG2', 'ZZREG2', null, '2005-01-01', 'Male', 'G', '9', null, 'Addr', '9', 'ZZ Dept', 'B.Tech', 'CSE', 'ZZ Batch', 'A', '2026-2027', 'ZZ Test College', current_date, 'active') returning id into v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A15 [admin] create student profile (admin add student): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A15 [admin] create student profile (admin add student)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      update student_profiles set dob = '2005-02-02', gender = 'Female', status = 'suspended', section = 'B' where user_id = v_student2; update student_profiles set status = 'active' where user_id = v_student2;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A16 [admin] update student profile: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A16 [admin] update student profile';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into class_memberships(class_id, student_id, enrolled_at) values (v_class2, v_student2, now());
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A17 [admin] enroll student in class: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A17 [admin] enroll student in class';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into notes(title, description, subject, teacher_name, teacher_id, class_id) values ('ZZ Admin Note', 'd', 'ZZ Subject', 'ZZ Teacher', v_teacher, v_class) returning id into v_tmp; insert into note_attachments(note_id, file_name, file_type, file_url) values (v_tmp, 'a.pdf', 'application/pdf', 'notes/x/a.pdf');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A18 [admin] create teacher note: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A18 [admin] create teacher note';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into platform_settings(id, platform_name, support_email, contact_phone, sidebar_default_collapsed, attendance_min_threshold) values (1, 'Dudex Smart Academy', 'support@test.invalid', '1', false, 75) on conflict (id) do update set platform_name = excluded.platform_name;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A19 [admin] save platform settings: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A19 [admin] save platform settings';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into activity_logs(action, entity, description, module) values ('CREATE', 'Test', 'zz', 'system');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A20 [admin] write activity log: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A20 [admin] write activity log';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into attendance_records(id, student_id, status, date, session_time, subject, mode) values (gen_random_uuid(), v_student2, 'Present', current_date, '10:00 AM', 'ZZ Subject', 'offline');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A21 [admin] record student attendance: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A21 [admin] record student attendance';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      update teacher_profiles set status = 'suspended' where user_id = v_teacher; update teacher_profiles set status = 'active' where user_id = v_teacher;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A22 [admin] suspend + reactivate teacher: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A22 [admin] suspend + reactivate teacher';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      insert into results(id, assessment_id, student_id, assessment_title, subject, subject_name, course_name, student_name, score, max_score, marks_obtained, max_marks, percentage, grade, status, result_status, feedback) values (gen_random_uuid(), (select id from assessments where title = 'ZZ Exam 2'), v_student2, 'ZZ Exam 2', 'ZZ Subject', 'ZZ Subject', 'B.Tech', 'ZZ Student Two', 70, 100, 70, 100, 70, 'B+', 'Passed', 'Passed', null) returning id into v_tmp; update results set score = 35, marks_obtained = 35, percentage = 35, grade = 'F', status = 'Failed', result_status = 'Failed' where id = v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A23 [admin] publish + correct result (results): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A23 [admin] publish + correct result (results)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      update profiles set full_name = 'ZZ Teacher Renamed', phone = '9876' where id = v_teacher;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A24 [admin] update teacher account details: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A24 [admin] update teacher account details';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      select provision_teacher_account('zz-teacher2@test.invalid', 'ZZ Teacher Two', 'FAC-ZZ2', v_dept, 'Professor', null, 'M.Tech', null) into v_tmp;
      reset role;
      if not ((select role from profiles where email = 'zz-teacher2@test.invalid') = 'teacher') then raise exception 'post-check failed: %', $q$(select role from profiles where email = 'zz-teacher2@test.invalid') = 'teacher'$q$; end if;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A25 [admin] provision teacher account (invite RPC): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A25 [admin] provision teacher account (invite RPC)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      select count(*) into v_cnt from profiles; if v_cnt < 4 then raise exception 'admin sees % profiles', v_cnt; end if; select count(*) into v_cnt from student_email_roster; if v_cnt < 1 then raise exception 'roster empty'; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL A26 [admin] read dashboards (profiles, students, teachers, roster): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS A26 [admin] read dashboards (profiles, students, teachers, roster)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from get_my_student_roster_profile(); if v_cnt <> 1 then raise exception 'roster profile rows %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S01 [student] roster eligibility RPC: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S01 [student] roster eligibility RPC';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      perform complete_my_student_registration('ZZ Student', '9999999999', 'ZZREG1', 'B.Tech', 'CSE', 'ZZ Batch', 'A', '2026-2027');
      reset role;
      if not (exists (select 1 from student_profiles where user_id = v_student and department = 'CSE')) then raise exception 'post-check failed: %', $q$exists (select 1 from student_profiles where user_id = v_student and department = 'CSE')$q$; end if;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S02 [student] complete registration RPC: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S02 [student] complete registration RPC';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      update profiles set phone = '8888', avatar_url = null where id = v_student; update student_profiles set dob = '2004-04-04', gender = 'Male', address = 'Home', alternate_phone = '7', github_url = 'https://github.com/x', skills = '{a}', career_interests = 'AI' where user_id = v_student;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S03 [student] update own profile: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S03 [student] update own profile';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      update profiles set full_name = 'ZZ Teacher', phone = '1234' where id = v_teacher;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T01 [teacher] update own account: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T01 [teacher] update own account';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      update teacher_profiles set qualification = 'PhD' where user_id = v_teacher;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T02 [teacher] update own teacher profile: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T02 [teacher] update own teacher profile';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from teacher_assignments where teacher_id = v_teacher; if v_cnt <> 1 then raise exception 'assignments %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T03 [teacher] read own assignments: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T03 [teacher] read own assignments';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from class_memberships where class_id = v_class; if v_cnt <> 1 then raise exception 'memberships %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T04 [teacher] read class roster: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T04 [teacher] read class roster';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from student_profiles sp join profiles p on p.id = sp.user_id where sp.user_id = v_student; if v_cnt <> 1 then raise exception 'student profile visible rows %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T05 [teacher] read student profiles + names: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T05 [teacher] read student profiles + names';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into class_sessions(class_id, teacher_id, session_date, subject, mode) values (v_class, v_teacher, current_date, 'ZZ Subject', 'offline') returning id into v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T06 [teacher] record class session: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T06 [teacher] record class session';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into attendance_records(student_id, class_id, teacher_id, date, session_time, subject, mode, status) values (v_student, v_class, v_teacher, current_date, 'Forenoon (FN)', 'ZZ Subject', 'offline', 'Present') returning id into v_tmp; update attendance_records set status = 'Absent', teacher_id = v_teacher, subject = 'ZZ Subject' where id = v_tmp; update attendance_records set status = 'Present' where id = v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T07 [teacher] mark + re-mark attendance: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T07 [teacher] mark + re-mark attendance';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into announcements(sender_name, sender_id, sender_role, title, content, priority, target_role, target_class, date, expiry_date, target_class_id) values ('ZZ Teacher', v_teacher, 'Teacher', 'ZZ Teacher Notice', 'Quiz tomorrow', 'High', 'student', 'ZZ Class', now(), null, v_class) returning id into v_ann; update announcements set title = 'ZZ Teacher Notice!', date = now() where id = v_ann;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T08 [teacher] post class announcement: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T08 [teacher] post class announcement';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into live_classes(class_id, teacher_id, teacher_name, title, subject, topic, date, scheduled_date, start_time, end_time, platform, meeting_url, status, mode) values (v_class, v_teacher, 'ZZ Teacher', 'ZZ Live', 'ZZ Subject', 'ZZ Live', current_date, current_date, '10:00', '11:00', 'Google Meet', 'https://meet.google.com/zzz', 'Upcoming', 'Online') returning id into v_lc; update live_classes set title = 'ZZ Live 2' where id = v_lc and teacher_id = v_teacher;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T09 [teacher] schedule + edit live class: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T09 [teacher] schedule + edit live class';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into assessments(created_by, teacher_id, title, description, class_id, subject, type, duration_minutes, total_questions, max_marks, total_marks, passing_marks, start_date, end_date, status, published)
    values (v_teacher, v_teacher, 'ZZ Quiz', null, v_class, 'ZZ Subject', 'MCQ', 30, 2, 2, 2, 1, now() - interval '1 minute', now() + interval '1 hour', 'draft', false) returning id into v_ass;
  insert into assessment_questions(assessment_id, question_text, question_type, marks, order_index, explanation) values (v_ass, '1+1?', 'mcq', 1, 1, null) returning id into v_q1;
  insert into assessment_questions(assessment_id, question_text, question_type, marks, order_index, explanation) values (v_ass, '2+2?', 'mcq', 1, 2, null) returning id into v_q2;
  insert into question_options(question_id, option_text, option_label, is_correct) values (v_q1, '2', 'A', true) returning id into v_opt_ok;
  insert into question_options(question_id, option_text, option_label, is_correct) values (v_q1, '3', 'B', false);
  insert into question_options(question_id, option_text, option_label, is_correct) values (v_q2, '4', 'A', true);
  insert into question_options(question_id, option_text, option_label, is_correct) values (v_q2, '5', 'B', false) returning id into v_opt_bad;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T10 [teacher] create MCQ assessment + questions + options: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T10 [teacher] create MCQ assessment + questions + options';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      update assessments set status = 'scheduled', published = true, duration_minutes = 30 where id = v_ass;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T11 [teacher] publish MCQ assessment: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T11 [teacher] publish MCQ assessment';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into coding_problems(assessment_id, title, description, language, starter_code, test_cases) values (v_ass, 'ZZ Sum', 'add', 'javascript', 'function f(){}', '[{"input":"1 2","output":"3"}]') returning id into v_cp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T12 [teacher] create coding problem: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T12 [teacher] create coding problem';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into notes(class_id, teacher_id, teacher_name, subject, title, description) values (v_class, v_teacher, 'ZZ Teacher', 'ZZ Subject', 'ZZ Note', 'd') returning id into v_note; insert into note_attachments(note_id, file_url, file_name, file_type) values (v_note, 'notes/'||v_class||'/'||v_note||'/a.pdf', 'a.pdf', 'application/pdf');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T13 [teacher] upload note + attachment row: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T13 [teacher] upload note + attachment row';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into activity_logs(actor_id, action, module, entity, description) values (v_teacher, 'ATTENDANCE_MARKED', 'class_sessions', 'x', '{}');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T14 [teacher] write activity log: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T14 [teacher] write activity log';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select code, code_id into v_code, v_tmp from start_attendance_code_session(v_class, 'ZZ Subject', 10);
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T15 [teacher] start attendance code RPC: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T15 [teacher] start attendance code RPC';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select notify_class(v_class, 'ZZ Alert', 'Check the quiz', 'announcement', null) into v_cnt; if v_cnt <> 1 then raise exception 'notified %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T16 [teacher] notify class RPC: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T16 [teacher] notify class RPC';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from class_sessions where teacher_id = v_teacher and session_date = current_date; perform count(*) from results; perform count(*) from notifications where user_id = v_teacher; perform count(*) from announcements order by 1;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T17 [teacher] read dashboards (sessions, results, notifications): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T17 [teacher] read dashboards (sessions, results, notifications)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      insert into assessments(title, type, provider, external_url, class_id, subject, duration_minutes, max_marks, total_marks, start_date, end_date, status, published, teacher_id, teacher_name, created_by, target_batch) values ('ZZ HR', 'Coding', 'hackerrank', 'https://www.hackerrank.com/zz', v_class, 'ZZ Subject', 60, 100, 100, now() - interval '1 minute', now() + interval '1 hour', 'scheduled', true, v_teacher, 'ZZ Teacher', v_teacher, 'ZZ Class') returning id into v_ext;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL T18 [teacher] create HackerRank (external) assessment: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS T18 [teacher] create HackerRank (external) assessment';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from live_classes where id = v_lc; if v_cnt <> 1 then raise exception 'live class visible %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S04 [student] sees teacher live class: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S04 [student] sees teacher live class';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from assessments where id = v_ass; if v_cnt <> 1 then raise exception 'assessment visible %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S05 [student] sees published assessment: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S05 [student] sees published assessment';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from student_assessment_questions where assessment_id = v_ass; if v_cnt <> 2 then raise exception 'questions %', v_cnt; end if; select count(*) into v_cnt from student_question_options o join student_assessment_questions q on q.id = o.question_id where q.assessment_id = v_ass; if v_cnt <> 4 then raise exception 'options %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S06 [student] reads questions + options via safe views: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S06 [student] reads questions + options via safe views';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from question_options where question_id in (v_q1, v_q2) and is_correct; if v_cnt > 0 then raise exception 'answer keys visible: %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S07 [student] cannot read answer keys (question_options.is_correct): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S07 [student] cannot read answer keys (question_options.is_correct)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from student_coding_problems where id = v_cp; if v_cnt <> 1 then raise exception 'coding problems %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S08 [student] reads coding problem via safe view: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S08 [student] reads coding problem via safe view';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select submit_assessment_attempt(v_ass, jsonb_build_object(v_q1::text, v_opt_ok::text, v_q2::text, v_opt_bad::text), 120) into v_json; if (v_json->>'percentage')::numeric <> 50 then raise exception 'graded %', v_json; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S09 [student] submit MCQ attempt RPC (1 right, 1 wrong): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S09 [student] submit MCQ attempt RPC (1 right, 1 wrong)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from results where assessment_id = v_ass and student_id = v_student; if v_cnt <> 1 then raise exception 'results %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S10 [student] sees own result: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S10 [student] sees own result';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      insert into code_submissions(problem_id, assessment_id, student_id, language, source_code, status) values (v_cp, v_ass, v_student, 'javascript', 'function f(){return 3}', 'submitted');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S11 [student] submit code: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S11 [student] submit code';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from notes where id = v_note; if v_cnt <> 1 then raise exception 'note %', v_cnt; end if; select count(*) into v_cnt from note_attachments where note_id = v_note; if v_cnt <> 1 then raise exception 'attachments %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S12 [student] sees teacher note + attachment: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S12 [student] sees teacher note + attachment';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from announcements where id = v_ann or title = 'ZZ Admin Notice'; if v_cnt <> 2 then raise exception 'announcements %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S13 [student] sees teacher + admin announcements: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S13 [student] sees teacher + admin announcements';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select mark_attendance_with_code(v_code) into v_json; if v_json->>'status' not in ('marked','already_marked') then raise exception '%', v_json; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S14 [student] mark attendance with code RPC: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S14 [student] mark attendance with code RPC';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from attendance_records where student_id = v_student; if v_cnt < 1 then raise exception 'attendance %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S15 [student] sees own attendance: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S15 [student] sees own attendance';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from notifications where user_id = v_student; if v_cnt <> 1 then raise exception 'notifications %', v_cnt; end if; update notifications set read = true where user_id = v_student;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S16 [student] reads + marks own notification: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S16 [student] reads + marks own notification';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      perform count(*) from colleges; perform count(*) from departments;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S17 [student] reads reference data (colleges, departments): ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S17 [student] reads reference data (colleges, departments)';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from assessments where id = v_ext and external_url is not null; if v_cnt <> 1 then raise exception 'external visible %', v_cnt; end if; insert into external_assessment_submissions(assessment_id, student_id, reported_score, screenshot_path) values (v_ext, v_student, 80, v_student::text || '/hr.png');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL S18 [student] sees HackerRank assessment + submits result: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS S18 [student] sees HackerRank assessment + submits result';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from results where assessment_id = v_ass; if v_cnt <> 1 then raise exception 'teacher sees % results', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X01 [teacher] sees student result for own quiz: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X01 [teacher] sees student result for own quiz';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from attendance_records where class_id = v_class and student_id = v_student; if v_cnt < 1 then raise exception 'attendance %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X02 [teacher] sees student attendance: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X02 [teacher] sees student attendance';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      update code_submissions set score = 8, status = 'evaluated', feedback = 'good' where problem_id = v_cp and student_id = v_student; insert into results(assessment_id, student_id, assessment_title, type, subject, score, max_score, marks_obtained, max_marks, percentage, grade, status, result_status, student_name, feedback) values (v_ass, v_student, 'ZZ Sum', 'Coding', 'ZZ Subject', 8, 10, 8, 10, 80, 'A', 'Passed', 'Passed', 'ZZ Student', 'good') returning id into v_tmp; update results set feedback = 'great' where id = v_tmp;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X04 [teacher] grade coding submission + publish result: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X04 [teacher] grade coding submission + publish result';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from results where student_id = v_student and type = 'Coding'; if v_cnt <> 1 then raise exception 'coding results %', v_cnt; end if; select count(*) into v_cnt from code_submissions where student_id = v_student and status = 'evaluated'; if v_cnt <> 1 then raise exception 'submission status %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X05 [student] sees graded coding result + submission status: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X05 [student] sees graded coding result + submission status';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from external_assessment_submissions where assessment_id = v_ext; if v_cnt <> 1 then raise exception 'teacher sees % submissions', v_cnt; end if; update external_assessment_submissions set status = 'Verified', verified_score = 78, reviewed_by = v_teacher, reviewed_at = now(), review_note = 'ok' where assessment_id = v_ext and student_id = v_student; insert into results(assessment_id, student_id, assessment_title, type, subject, score, max_score, marks_obtained, max_marks, percentage, grade, status, result_status, student_name) values (v_ext, v_student, 'ZZ HR', 'Coding', 'ZZ Subject', 78, 100, 78, 100, 78, 'B+', 'Passed', 'Passed', 'ZZ Student');
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X06 [teacher] reviews + verifies HackerRank result, publishes to results: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X06 [teacher] reviews + verifies HackerRank result, publishes to results';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      update external_assessment_submissions set reported_score = 100 where assessment_id = v_ext and student_id = v_student; if (select reported_score from external_assessment_submissions where assessment_id = v_ext and student_id = v_student) <> 80 then raise exception 'verified submission was changed'; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X07 [student] cannot alter a verified submission: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X07 [student] cannot alter a verified submission';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      select count(*) into v_cnt from external_assessment_submissions where assessment_id = v_ext; if v_cnt <> 1 then raise exception 'admin sees %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X08 [admin] sees HackerRank submissions: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X08 [admin] sees HackerRank submissions';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student2, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student2::text, true); set local role authenticated;
      insert into external_assessment_submissions(assessment_id, student_id, reported_score, screenshot_path) values (v_ext, v_student2, 90, v_student2::text || '/hr.png');
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N11 [student2] non-member cannot submit HackerRank result (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N11 [student2] non-member cannot submit HackerRank result: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      insert into external_assessment_submissions(assessment_id, student_id, reported_score, screenshot_path, status, verified_score) values (v_ass, v_student, 99, v_student::text || '/x.png', 'Verified', 99);
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N12 [student] student cannot self-verify (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N12 [student] student cannot self-verify: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_admin::text, true); set local role authenticated;
      select count(*) into v_cnt from results where assessment_id = v_ass; if v_cnt <> 2 then raise exception 'admin results %', v_cnt; end if; select count(*) into v_cnt from code_submissions where problem_id = v_cp; if v_cnt <> 1 then raise exception 'admin submissions %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL X03 [admin] sees student result + submission: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS X03 [admin] sees student result + submission';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student2, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student2::text, true); set local role authenticated;
      select count(*) into v_cnt from student_assessment_questions where assessment_id = v_ass; if v_cnt <> 0 then raise exception 'leak: % questions', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL N01 [student2] non-member cannot see quiz questions: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS N01 [student2] non-member cannot see quiz questions';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student2, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student2::text, true); set local role authenticated;
      perform mark_attendance_with_code(v_code);
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N02 [student2] non-member cannot use class attendance code (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N02 [student2] non-member cannot use class attendance code: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      insert into announcements(sender_name, title, content, target_role) values ('x', 'x', 'x', 'all');
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N03 [student] student cannot post announcements (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N03 [student] student cannot post announcements: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      update profiles set role = 'admin' where id = v_student;
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N04 [student] student cannot make self admin (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N04 [student] student cannot make self admin: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from attendance_records where student_id = v_student2; if v_cnt <> 0 then raise exception 'leak: % rows', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL N05 [student] student cannot see other students attendance: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS N05 [student] student cannot see other students attendance';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      perform submit_assessment_attempt(v_ass, '{}'::jsonb, 0);
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N06 [student] student cannot submit quiz twice (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N06 [student] student cannot submit quiz twice: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      select count(*) into v_cnt from allowed_emails; if v_cnt <> 0 then raise exception 'leak: % rows', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL N07 [teacher] teacher cannot read allow-list: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS N07 [teacher] teacher cannot read allow-list';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_teacher::text, true); set local role authenticated;
      perform provision_teacher_account('zz-student@test.invalid', 'x', 'x', v_dept, 'x', null, null, null);
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N08 [teacher] teacher cannot provision teachers (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N08 [teacher] teacher cannot provision teachers: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('request.jwt.claim.sub', '', true); set local role anon;
      perform count(*) from profiles;
      reset role;
    exception when others then
      reset role;
      ok := ok + 1; report := report || E'\nPASS N09 [anon] anonymous cannot read profiles (rejected: ' || left(sqlerrm, 90) || ')'; goto_next := true;
    end;
    if not goto_next then
      fail := fail + 1; report := report || E'\nFAIL N09 [anon] anonymous cannot read profiles: was NOT rejected';
    end if;
    goto_next := false;
  end;
  begin
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', v_student::text, true); set local role authenticated;
      select count(*) into v_cnt from results where student_id = v_student2; if v_cnt <> 0 then raise exception 'leak: %', v_cnt; end if;
      reset role;
    exception when others then
      reset role;
      fail := fail + 1; report := report || E'\nFAIL N10 [student] student cannot read other students results: ' || sqlerrm; goto_next := true;
    end;
    if not goto_next then
      ok := ok + 1; report := report || E'\nPASS N10 [student] student cannot read other students results';
    end if;
    goto_next := false;
  end;

  raise exception 'ITEST_REPORT pass=% fail=% %', ok, fail, report;
end
$T$;