import React, {
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  X,
  Info,
  ChevronDown,
} from 'lucide-react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { Button } from '../../components/common/Button';

import { teacherService } from '../../services/teacherService';
import { teacherLeaveService } from '../../services/teacherLeaveService';

import { Teacher } from '../../types';

import {
  getTeacherLeaveDemo,
  TeacherLeaveDemo,
} from '../../data/teacherLeaveDemo';


export const TeacherLeaveDetailPage: React.FC = () => {

  const navigate =
    useNavigate();


  const { teacherId } =
    useParams<{
      teacherId: string;
    }>();


  const [teacher, setTeacher] =
    useState<Teacher | null>(null);


  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveData, setLeaveData] =
    useState<TeacherLeaveDemo | null>(
      null
    );


  const [
    showLeaveModal,
    setShowLeaveModal,
  ] = useState(false);


  useEffect(() => {
    if (!teacherId) {
      return;
    }

    const load = () => {
      const foundTeacher = teacherService.getTeacherById(teacherId);
      if (foundTeacher) {
        setTeacher(foundTeacher);
        setLeaveData(getTeacherLeaveDemo(foundTeacher.id));
        setLeaveRequests(teacherLeaveService.getLeaveByTeacherId(foundTeacher.id));
      }
    };

    load();
    teacherService.fetchTeachers().then(load);
    teacherLeaveService.fetchLeaveRequests().then(load);

    const unsubT = teacherService.onChange(load);
    window.addEventListener('dudex_teachers_changed', load);
    window.addEventListener('dudex_teacher_leave_changed', load);

    return () => {
      unsubT();
      window.removeEventListener('dudex_teachers_changed', load);
      window.removeEventListener('dudex_teacher_leave_changed', load);
    };
  }, [teacherId]);


  if (
    !teacher ||
    !leaveData
  ) {

    return (

      <div
        className="
          min-h-[500px]
          flex
          items-center
          justify-center
        "
      >

        <div
          className="
            text-center
            text-[#A1A1AA]
          "
        >

          Teacher not found.

        </div>

      </div>

    );
  }


  return (

    <div
      className="
        max-w-7xl
        mx-auto
        space-y-6
      "
    >

      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <div>

        <button
          onClick={() =>
            navigate(
              '/admin/teachers/leave'
            )
          }
          className="
            flex
            items-center
            gap-2
            text-xs
            font-semibold
            text-[#A1A1AA]
            hover:text-[#D78B55]
            mb-4
          "
        >

          <ArrowLeft className="w-4 h-4" />

          BACK TO TEACHERS

        </button>


        <h1
          className="
            text-2xl
            md:text-3xl
            font-bold
            text-[#F5F5F5]
          "
        >
          Teacher Leave
        </h1>


        <p
          className="
            text-sm
            text-[#A1A1AA]
            mt-1
          "
        >
          Manage advance leave requests
          for this faculty member.
        </p>


        {/* ============================================================ */}
        {/* TEACHER IDENTITY                                              */}
        {/* ============================================================ */}

        <div
          className="
            mt-4
            flex
            flex-wrap
            gap-2
          "
        >

          <span
            className="
              px-3
              py-1.5
              rounded-full
              bg-[#3A2418]
              border
              border-[#5A321F]
              text-[#E7A66D]
              text-xs
              font-semibold
            "
          >
            {leaveData.facultyName}
          </span>


          <span
            className="
              px-3
              py-1.5
              rounded-full
              bg-[#242424]
              border
              border-[#3A3A3A]
              text-[#D4D4D8]
              text-xs
            "
          >
            {leaveData.department}
          </span>


          <span
            className="
              px-3
              py-1.5
              rounded-full
              bg-[#242424]
              border
              border-[#3A3A3A]
              text-[#D4D4D8]
              text-xs
            "
          >
            {teacher.teacherId}
          </span>

        </div>

      </div>


      {/* ================================================================ */}
      {/* LEAVE SUMMARY                                                    */}
      {/* ================================================================ */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-4
        "
      >

        <LeaveSummaryCard
          title="CASUAL LEAVE"
          value={
            leaveData.casualLeaveRemaining
          }
          subtitle="Days Remaining"
        />


        <LeaveSummaryCard
          title="MEDICAL LEAVE"
          value={
            leaveData.medicalLeaveRemaining
          }
          subtitle="Days Remaining"
        />


        <LeaveSummaryCard
          title="PENDING REQUESTS"
          value={leaveRequests.filter((r: any) => r.status === 'pending').length || leaveData.pendingRequests}
          subtitle="Awaiting Approval"
        />

      </div>


      {/* ================================================================ */}
      {/* SUBMIT LEAVE SECTION                                             */}
      {/* ================================================================ */}

      <div
        className="
          rounded-2xl
          border
          border-[#4A3024]
          bg-[#1C1A19]
          p-6
        "
      >

        <div
          className="
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-5
          "
        >

          <div>

            <h2
              className="
                text-lg
                font-bold
                text-[#F5F5F5]
              "
            >
              Apply Advance Leave
            </h2>


            <p
              className="
                text-sm
                text-[#A1A1AA]
                mt-1
              "
            >
              Submit planned faculty leave
              in advance.
            </p>

          </div>


          <button
            onClick={() =>
              setShowLeaveModal(true)
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              px-5
              py-2.5
              rounded-xl
              bg-[#C97809]
              text-white
              text-sm
              font-bold
              hover:bg-[#B66C07]
              transition-colors
            "
          >

            <CalendarDays
              className="w-4 h-4"
            />

            Submit Leave Request

          </button>

        </div>

      </div>


      {/* ================================================================ */}
      {/* EXACT ADVANCE LEAVE MODAL                                        */}
      {/* ================================================================ */}

      
      {/* ================================================================ */}
      {/* LEAVE REQUESTS HISTORY TABLE                                     */}
      {/* ================================================================ */}
      <div className="rounded-2xl border border-[#4A3024] bg-[#1C1A19] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2320] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#F5F5F5]">Leave Requests History</h2>
          <span className="text-xs text-[#9A938C]">{leaveRequests.length} requests</span>
        </div>

        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center text-[#9A938C]">
            <CalendarDays className="w-9 h-9 mx-auto mb-3 opacity-30 text-[#E7A66D]" />
            <p className="text-sm font-medium text-[#D4D4D8]">No leave requests found</p>
            <p className="text-xs mt-1 text-[#9A938C]">
              Planned leaves submitted for this faculty member will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#24201E] text-xs uppercase text-[#9A938C]">
                <tr>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Dates</th>
                  <th className="px-6 py-3 font-medium">Reason</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2320]">
                {leaveRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-[#24201E]/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#F5F5F5] capitalize">
                      {req.leaveType} Leave
                    </td>
                    <td className="px-6 py-4 text-[#D4D4D8]">
                      {req.totalDays} day{req.totalDays > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 text-[#A1A1AA] text-xs">
                      {req.fromDate} to {req.toDate}
                    </td>
                    <td className="px-6 py-4 text-[#D4D4D8] text-xs max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          req.status === 'approved'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : req.status === 'rejected'
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => teacherLeaveService.updateLeaveStatus(req.id, 'approved', 'Approved by Admin').catch((err: unknown) => window.alert(err instanceof Error ? err.message : 'Could not update the leave request.'))}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => teacherLeaveService.updateLeaveStatus(req.id, 'rejected', 'Declined by Admin').catch((err: unknown) => window.alert(err instanceof Error ? err.message : 'Could not update the leave request.'))}
                            className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#71717A]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLeaveModal && (

        <AdvanceLeaveModal
          teacher={teacher}
          leaveData={leaveData}
          onClose={() =>
            setShowLeaveModal(false)
          }
        />

      )}

    </div>
  );
};


/* ========================================================================= */
/* LEAVE SUMMARY CARD                                                       */
/* ========================================================================= */

interface LeaveSummaryCardProps {
  title: string;
  value: number;
  subtitle: string;
}


const LeaveSummaryCard: React.FC<
  LeaveSummaryCardProps
> = ({
  title,
  value,
  subtitle,
}) => {

  return (

    <div
      className="
        rounded-2xl
        border
        border-[#4A3024]
        bg-[#1C1A19]
        p-5
      "
    >

      <p
        className="
          text-[10px]
          uppercase
          tracking-wide
          font-bold
          text-[#9A938C]
        "
      >
        {title}
      </p>


      <div
        className="
          mt-2
          flex
          items-baseline
          gap-2
        "
      >

        <span
          className="
            text-3xl
            font-bold
            text-[#F5F5F5]
          "
        >
          {value}
        </span>


        <span
          className="
            text-xs
            text-[#A1A1AA]
          "
        >
          {subtitle}
        </span>

      </div>

    </div>
  );
};


/* ========================================================================= */
/* ADVANCE LEAVE MODAL                                                      */
/* ========================================================================= */

interface AdvanceLeaveModalProps {
  teacher: Teacher;
  leaveData: TeacherLeaveDemo;
  onClose: () => void;
}


const AdvanceLeaveModal: React.FC<
  AdvanceLeaveModalProps
> = ({
  teacher,
  leaveData,
  onClose,
}) => {

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];


  const [fromDate, setFromDate] =
    useState(tomorrow);


  const [toDate, setToDate] =
    useState(tomorrow);


  const [leaveType, setLeaveType] =
    useState('casual');


  const [reason, setReason] =
    useState('');


  const [submitted, setSubmitted] =
    useState(false);


  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason.trim()) {
      return;
    }

    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).getTime();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    try {
      await teacherLeaveService.submitLeaveRequest({
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        department: teacher.department,
        leaveType: leaveType as any,
        fromDate,
        toDate,
        totalDays: days,
        reason: reason.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to submit the leave request.');
    }
  };


  return (

    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        p-4
      "
    >

      {/* ================================================================ */}
      {/* BACKDROP                                                         */}
      {/* ================================================================ */}

      <div
        onClick={onClose}
        className="
          absolute
          inset-0
          bg-black/40
          backdrop-blur-[2px]
        "
      />


      {/* ================================================================ */}
      {/* MODAL                                                            */}
      {/* ================================================================ */}

      <div
        className="
          relative
          w-full
          max-w-[550px]
          max-h-[95vh]
          overflow-y-auto
          rounded-[22px]
          bg-[#FFFDFC]
          shadow-2xl
          border
          border-[#E5DED4]
        "
      >

        {/* ============================================================ */}
        {/* MODAL HEADER                                                  */}
        {/* ============================================================ */}

        <div
          className="
            px-7
            pt-7
            pb-4
            border-b
            border-[#E5DED4]
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
            "
          >

            <div
              className="
                flex
                items-start
                gap-3
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-xl
                  bg-[#FFF1C7]
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                <CalendarDays
                  className="
                    w-5
                    h-5
                    text-[#9B6B22]
                  "
                />

              </div>


              <div>

                <h2
                  className="
                    text-xl
                    font-bold
                    text-[#252321]
                  "
                >
                  Apply Advance Leave
                </h2>


                <p
                  className="
                    text-sm
                    text-[#8E8881]
                    mt-0.5
                  "
                >
                  Submit planned faculty
                  leave in advance
                </p>

              </div>

            </div>


            <button
              onClick={onClose}
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                text-[#8C8781]
                hover:bg-[#F2EEE8]
                hover:text-[#302D2A]
              "
            >

              <X className="w-5 h-5" />

            </button>

          </div>

        </div>


        {/* ============================================================ */}
        {/* BODY                                                          */}
        {/* ============================================================ */}

        <div
          className="
            px-7
            py-4
            space-y-5
          "
        >

          {/* ========================================================== */}
          {/* FACULTY NAME                                                */}
          {/* ========================================================== */}

          <div
            className="
              rounded-xl
              border
              border-[#E6DED3]
              bg-[#FBF8F2]
              px-4
              py-3
            "
          >

            <p
              className="
                text-[10px]
                uppercase
                tracking-wide
                font-bold
                text-[#8B8178]
              "
            >
              Faculty
            </p>


            <p
              className="
                mt-1
                text-sm
                font-bold
                text-[#332E29]
              "
            >
              {leaveData.facultyName}
            </p>


            <p
              className="
                mt-0.5
                text-xs
                text-[#837A71]
              "
            >
              {leaveData.department}
              {' • '}
              {leaveData.teacherId}
            </p>

          </div>


          {/* ========================================================== */}
          {/* POLICY NOTICE                                               */}
          {/* ========================================================== */}

          <div
            className="
              rounded-2xl
              border
              border-[#E7DDCA]
              bg-[#FFFBF0]
              p-4
            "
          >

            <div
              className="
                flex
                items-start
                gap-3
              "
            >

              <Info
                className="
                  w-5
                  h-5
                  text-[#A36D2A]
                  shrink-0
                  mt-0.5
                "
              />


              <div>

                <p
                  className="
                    text-sm
                    font-bold
                    text-[#493726]
                  "
                >
                  Academic Leave Policy Notice:
                </p>


                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-[#8A6039]
                  "
                >
                  The leave should be taken at
                  least{' '}
                  <strong>
                    one day in advance
                  </strong>
                  . Same-day (today) and
                  past-dated leaves are not
                  allowed. You may only select
                  dates starting from tomorrow
                  onwards.
                </p>

              </div>

            </div>

          </div>


          {/* ========================================================== */}
          {/* DATES                                                       */}
          {/* ========================================================== */}

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              gap-4
            "
          >

            {/* FROM */}

            <div>

              <label
                className="
                  block
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-[#5D5751]
                  mb-2
                "
              >
                From Date
                <span className="text-[#B52B2B]">
                  {' '}*
                </span>
              </label>


              <div
                className="
                  relative
                "
              >

                <input
                  type="date"
                  min={tomorrow}
                  value={fromDate}
                  onChange={(event) =>
                    setFromDate(
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    h-12
                    px-3
                    pr-10
                    rounded-xl
                    border
                    border-[#DDD6CD]
                    bg-[#FFFDFC]
                    text-sm
                    font-semibold
                    text-[#3A3530]
                    outline-none
                    focus:border-[#C97809]
                    focus:ring-2
                    focus:ring-[#C97809]/10
                  "
                />

              </div>


              <p
                className="
                  mt-1.5
                  text-[11px]
                  text-[#938C84]
                "
              >
                From tomorrow onwards only
              </p>

            </div>


            {/* TO */}

            <div>

              <label
                className="
                  block
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-[#5D5751]
                  mb-2
                "
              >
                To Date
                <span className="text-[#B52B2B]">
                  {' '}*
                </span>
              </label>


              <div
                className="
                  relative
                "
              >

                <input
                  type="date"
                  min={
                    fromDate ||
                    tomorrow
                  }
                  value={toDate}
                  onChange={(event) =>
                    setToDate(
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    h-12
                    px-3
                    pr-10
                    rounded-xl
                    border
                    border-[#DDD6CD]
                    bg-[#FFFDFC]
                    text-sm
                    font-semibold
                    text-[#3A3530]
                    outline-none
                    focus:border-[#C97809]
                    focus:ring-2
                    focus:ring-[#C97809]/10
                  "
                />

              </div>


              <p
                className="
                  mt-1.5
                  text-[11px]
                  text-[#938C84]
                "
              >
                End date of leave
              </p>

            </div>

          </div>


          {/* ========================================================== */}
          {/* LEAVE TYPE                                                  */}
          {/* ========================================================== */}

          <div>

            <label
              className="
                block
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-[#5D5751]
                mb-2
              "
            >
              Leave Type
              <span className="text-[#B52B2B]">
                {' '}*
              </span>
            </label>


            <div className="relative">

              <select
                value={leaveType}
                onChange={(event) =>
                  setLeaveType(
                    event.target.value
                  )
                }
                className="
                  w-full
                  h-12
                  appearance-none
                  px-4
                  pr-10
                  rounded-xl
                  border
                  border-[#DDD6CD]
                  bg-[#FFFDFC]
                  text-sm
                  font-medium
                  text-[#3A3530]
                  outline-none
                  focus:border-[#C97809]
                  focus:ring-2
                  focus:ring-[#C97809]/10
                "
              >

                <option value="casual">
                  Casual Leave (CL) — {
                    leaveData.casualLeaveRemaining
                  } Days Remaining
                </option>


                <option value="medical">
                  Medical Leave (ML) — {
                    leaveData.medicalLeaveRemaining
                  } Days Remaining
                </option>

              </select>


              <ChevronDown
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  w-4
                  h-4
                  text-[#8D867F]
                  pointer-events-none
                "
              />

            </div>

          </div>


          {/* ========================================================== */}
          {/* REASON                                                      */}
          {/* ========================================================== */}

          <div>

            <label
              className="
                block
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-[#5D5751]
                mb-2
              "
            >
              Reason for Leave
              <span className="text-[#B52B2B]">
                {' '}*
              </span>
            </label>


            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Please describe the purpose/reason for your leave request in detail..."
              className="
                w-full
                resize-none
                px-4
                py-3
                rounded-xl
                border
                border-[#DDD6CD]
                bg-[#FFFDFC]
                text-sm
                text-[#3A3530]
                placeholder:text-[#AAA39C]
                outline-none
                focus:border-[#C97809]
                focus:ring-2
                focus:ring-[#C97809]/10
              "
            />

          </div>


          {/* ========================================================== */}
          {/* SUCCESS                                                      */}
          {/* ========================================================== */}

          {submitted && (

            <div
              className="
                rounded-xl
                border
                border-[#B9DEC8]
                bg-[#EFFAF3]
                px-4
                py-3
                text-sm
                font-semibold
                text-[#28704B]
              "
            >
              Leave request submitted successfully
              for {leaveData.facultyName}.
            </div>

          )}

        </div>


        {/* ============================================================ */}
        {/* FOOTER                                                        */}
        {/* ============================================================ */}

        <div
          className="
            mx-7
            border-t
            border-[#E5DED4]
            px-0
            py-5
            flex
            items-center
            justify-end
            gap-3
          "
        >

          <button
            onClick={onClose}
            className="
              h-11
              px-5
              rounded-xl
              border
              border-[#DDD6CD]
              bg-[#FFFDFC]
              text-sm
              font-semibold
              text-[#625C56]
              hover:bg-[#F7F3EE]
            "
          >
            Cancel
          </button>


          <button
            onClick={
              handleSubmit
            }
            disabled={
              !fromDate ||
              !toDate ||
              !reason.trim()
            }
            className="
              h-11
              px-6
              rounded-xl
              bg-[#C97809]
              text-white
              text-sm
              font-bold
              shadow-sm
              hover:bg-[#B86E08]
              disabled:opacity-50
              disabled:cursor-not-allowed
              transition-colors
            "
          >
            Submit Leave Request
          </button>

        </div>

      </div>

    </div>
  );
};


export default TeacherLeaveDetailPage;
