import React from 'react';

interface CreateTeacherNoteModalProps {
  open?: boolean;
  onClose?: () => void;
}

const CreateTeacherNoteModal: React.FC<
  CreateTeacherNoteModalProps
> = ({
  open = false,
  onClose,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

      <div className="w-full max-w-md rounded-xl border border-[#4A3428] bg-[#1C1917] p-6 shadow-2xl">

        <div className="flex items-center justify-between">

          <h2 className="text-lg font-semibold text-[#F5F0EA]">
            Create Teacher Note
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-[#A89A91] hover:text-white"
          >
            ×
          </button>

        </div>

        <p className="mt-3 text-sm text-[#A89A91]">
          Use the Create Note page to add a new teacher note.
        </p>

        <div className="mt-6 flex justify-end">

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#7A4930] px-4 py-2 text-sm font-medium text-white hover:bg-[#946246]"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
};

export default CreateTeacherNoteModal;
