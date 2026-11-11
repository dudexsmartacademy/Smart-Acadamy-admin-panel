-- Security regression test for the audit fixes in migration 057 (AUD-01..AUD-04).
-- Paste into the Supabase SQL Editor and run. Like role_simulation_test.sql it
-- creates throwaway fixtures and ENDS WITH AN ERROR ON PURPOSE
-- ("SECTEST pass=N fail=M ...") so every change is rolled back.

do $T$
declare
  report text := ''; ok int := 0; fail int := 0;
  v_teacher uuid := gen_random_uuid(); v_teacher2 uuid := gen_random_uuid(); v_student uuid := gen_random_uuid();
  v_college uuid; v_class uuid; v_ass uuid; v_q uuid; v_cnt int;
begin
  -- ===== fixtures (as postgres; rolled back at the end) =====
  insert into colleges(name, code) values ('ZZ Sec College', 'ZZS-'||substr(md5(random()::text),1,6)) returning id into v_college;
  insert into allowed_emails(email, role, full_name, status) values
    ('zz-sec-teacher@test.invalid', 'teacher', 'ZZ Sec Teacher', 'active'),
    ('zz-sec-teacher2@test.invalid', 'teacher', 'ZZ Sec Teacher Two', 'active');
  insert into student_email_roster(college_id, college_name, email, status) values
    (v_college, 'ZZ Sec College', 'zz-sec-student@test.invalid', 'active');
  insert into auth.users(id, email, raw_user_meta_data, email_confirmed_at, aud, role) values
    (v_teacher, 'zz-sec-teacher@test.invalid', '{"full_name":"ZZ Sec Teacher"}', now(), 'authenticated', 'authenticated'),
    (v_teacher2, 'zz-sec-teacher2@test.invalid', '{"full_name":"ZZ Sec Teacher Two"}', now(), 'authenticated', 'authenticated'),
    (v_student, 'zz-sec-student@test.invalid', '{"full_name":"ZZ Sec Student"}', now(), 'authenticated', 'authenticated');
  update profiles set role = 'teacher' where id in (v_teacher, v_teacher2);
  insert into teacher_profiles(user_id, department, designation, status) values
    (v_teacher, 'ZZ Dept', 'Professor', 'active'), (v_teacher2, 'ZZ Dept', 'Professor', 'active');
  insert into classes(name, department, batch, section, academic_year, teacher_id)
    values ('ZZ Sec Class', 'ZZ Dept', 'ZZ Batch', 'A', '2026-2027', v_teacher) returning id into v_class;
  insert into teacher_assignments(class_id, teacher_id, subject) values (v_class, v_teacher, 'ZZ Subject');
  insert into class_memberships(class_id, student_id) values (v_class, v_student) on conflict do nothing;
  -- Published exam that starts tomorrow.
  insert into assessments(created_by, teacher_id, title, class_id, subject, type, duration_minutes, total_questions,
                          max_marks, total_marks, passing_marks, start_date, end_date, status, published)
    values (v_teacher, v_teacher, 'ZZ Future Exam', v_class, 'ZZ Subject', 'MCQ', 30, 1, 1, 1, 1,
            now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled', true) returning id into v_ass;
  insert into assessment_questions(assessment_id, question_text, question_type, marks, order_index)
    values (v_ass, 'Secret?', 'mcq', 1, 1) returning id into v_q;
  insert into question_options(question_id, option_text, option_label, is_correct) values
    (v_q, 'Yes', 'A', true), (v_q, 'No', 'B', false);

  -- S01 (AUD-02): anon cannot probe the roster / allow-list.
  if has_function_privilege('anon', 'public.is_email_allowed(text)', 'execute') then
    fail := fail + 1; report := report || E'\nFAIL S01 anon can execute is_email_allowed';
  else
    ok := ok + 1; report := report || E'\nPASS S01 anon cannot execute is_email_allowed';
  end if;

  -- Act as the student.
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_student::text, true);
  set local role authenticated;

  -- S02/S03 (AUD-01): no exam content before the window opens.
  select count(*) into v_cnt from student_assessment_questions where assessment_id = v_ass;
  if v_cnt = 0 then ok := ok + 1; report := report || E'\nPASS S02 future exam questions hidden from student';
  else fail := fail + 1; report := report || E'\nFAIL S02 student sees ' || v_cnt || ' questions of a future exam'; end if;

  select count(*) into v_cnt from student_question_options where question_id = v_q;
  if v_cnt = 0 then ok := ok + 1; report := report || E'\nPASS S03 future exam options hidden from student';
  else fail := fail + 1; report := report || E'\nFAIL S03 student sees ' || v_cnt || ' options of a future exam'; end if;

  -- S04/S05 (AUD-03): a student sees their own teacher, not other teachers.
  select count(*) into v_cnt from profiles where id = v_teacher;
  if v_cnt = 1 then ok := ok + 1; report := report || E'\nPASS S04 student can see own class teacher profile';
  else fail := fail + 1; report := report || E'\nFAIL S04 student cannot see own class teacher profile'; end if;

  select count(*) into v_cnt from profiles where id = v_teacher2;
  if v_cnt = 0 then ok := ok + 1; report := report || E'\nPASS S05 student cannot see unrelated teacher profile';
  else fail := fail + 1; report := report || E'\nFAIL S05 student can see unrelated teacher profile'; end if;

  reset role;

  -- Open the exam window, then the same student must see the content (no regression).
  update assessments set start_date = now() - interval '1 minute', end_date = now() + interval '1 hour' where id = v_ass;
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_cnt from student_assessment_questions where assessment_id = v_ass;
  if v_cnt = 1 then ok := ok + 1; report := report || E'\nPASS S06 open exam questions visible to student';
  else fail := fail + 1; report := report || E'\nFAIL S06 open exam shows ' || v_cnt || ' questions'; end if;

  select count(*) into v_cnt from student_question_options where question_id = v_q;
  if v_cnt = 2 then ok := ok + 1; report := report || E'\nPASS S07 open exam options visible to student';
  else fail := fail + 1; report := report || E'\nFAIL S07 open exam shows ' || v_cnt || ' options'; end if;

  reset role;

  -- S08/S09: teachers still see teacher profiles (staff directory) after the policy change.
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher2, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_cnt from profiles where id = v_teacher;
  reset role;
  if v_cnt = 1 then ok := ok + 1; report := report || E'\nPASS S08 teacher can see other teacher profiles';
  else fail := fail + 1; report := report || E'\nFAIL S08 teacher cannot see other teacher profiles'; end if;

  -- S09 (AUD-04): SECURITY DEFINER helpers have a fixed search_path.
  select count(*) into v_cnt
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if v_cnt = 0 then ok := ok + 1; report := report || E'\nPASS S09 every SECURITY DEFINER function pins search_path';
  else fail := fail + 1; report := report || E'\nFAIL S09 ' || v_cnt || ' SECURITY DEFINER functions without search_path'; end if;

  raise exception 'SECTEST pass=% fail=% %', ok, fail, report;
end
$T$;
