export interface GradeScale {
  minPercentage: number;
  grade: string;
  gpa: number;
  description: string;
  isPass: boolean;
}

export const DEFAULT_GRADE_SCALES: GradeScale[] = [
  { minPercentage: 90, grade: 'A+', gpa: 4.0, description: 'Outstanding Distinction', isPass: true },
  { minPercentage: 80, grade: 'A', gpa: 3.7, description: 'Excellent Academic Merit', isPass: true },
  { minPercentage: 70, grade: 'B+', gpa: 3.3, description: 'Very Good Performance', isPass: true },
  { minPercentage: 60, grade: 'B', gpa: 3.0, description: 'Good Standard', isPass: true },
  { minPercentage: 50, grade: 'C', gpa: 2.0, description: 'Satisfactory Pass', isPass: true },
  { minPercentage: 0, grade: 'F', gpa: 0.0, description: 'Fail / Needs Remedial Examination', isPass: false },
];

export function calculateGrade(marksObtained: number, maxMarks: number): {
  percentage: number;
  grade: string;
  gpa: number;
  isPass: boolean;
  resultStatus: 'pass' | 'fail';
  description: string;
} {
  if (maxMarks <= 0) {
    return {
      percentage: 0,
      grade: 'F',
      gpa: 0,
      isPass: false,
      resultStatus: 'fail',
      description: 'Invalid Marks Structure',
    };
  }

  const rawPercent = (marksObtained / maxMarks) * 100;
  const percentage = Math.round(rawPercent * 10) / 10;

  for (const scale of DEFAULT_GRADE_SCALES) {
    if (percentage >= scale.minPercentage) {
      return {
        percentage,
        grade: scale.grade,
        gpa: scale.gpa,
        isPass: scale.isPass,
        resultStatus: scale.isPass ? 'pass' : 'fail',
        description: scale.description,
      };
    }
  }

  return {
    percentage,
    grade: 'F',
    gpa: 0,
    isPass: false,
    resultStatus: 'fail',
    description: 'Fail',
  };
}
