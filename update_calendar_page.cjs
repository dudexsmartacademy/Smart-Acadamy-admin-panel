const fs = require('fs');
const filePath = 'D:\\dudex-teacher-portal\\src\\pages\\calendar\\Calendar.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add imports
content = content.replace(
  'import CustomSelect from "../../components/CustomSelect";',
  'import CustomSelect from "../../components/CustomSelect";\nimport MultiSelectChecklist from "../../components/MultiSelectChecklist";\nimport { useBatchOptions } from "../../hooks/useBatchOptions";'
);

// 2. Add selectedBatches and useBatchOptions
const oldClassFilter = `  const [classFilter, setClassFilter] =
    useState("All");`;

const newClassFilter = `  const [classFilter, setClassFilter] = useState("All");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const { options: globalBatchOptions, loading: batchesLoading } = useBatchOptions();`;

content = content.replace(oldClassFilter, newClassFilter);

// 3. Update matchesClass in filteredEvents
const oldMatchesClass = `        const matchesClass =
          classFilter === "All" ||
          event.className === classFilter ||
          event.classId === classFilter ||
          (event.className || "").toLowerCase().includes(classFilter.toLowerCase());`;

const newMatchesClass = `        const matchesClass =
          (classFilter === "All" ||
            event.className === classFilter ||
            event.classId === classFilter ||
            (event.className || "").toLowerCase().includes(classFilter.toLowerCase())) &&
          (selectedBatches.length === 0 ||
            selectedBatches.some((b) =>
              (event.className || "").toLowerCase().includes(b.toLowerCase()) ||
              (event.classId || "").toLowerCase() === b.toLowerCase()
            ));`;

content = content.replace(oldMatchesClass, newMatchesClass);

// 4. Update dependencies of filteredEvents
content = content.replace(
  '      classFilter,\n    ]',
  '      classFilter,\n      selectedBatches,\n    ]'
);

// 5. Replace Target Batch CustomSelect with MultiSelectChecklist
const oldTargetBatchUI = `          {/* Target Batch */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Layers size={14} className="text-gray-400" />
              Target Batch
            </label>
            <CustomSelect
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              options={batchOptions}
            />
          </div>`;

const newTargetBatchUI = `          {/* Target Batch */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Layers size={14} className="text-gray-400" />
              Target Batch
            </label>
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
              disabled={batchesLoading}
            />
          </div>`;

content = content.replace(oldTargetBatchUI, newTargetBatchUI);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Calendar.tsx updated with MultiSelectChecklist');
