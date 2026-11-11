const fs = require('fs');
const filePath = 'D:\\dudex-teacher-portal\\src\\pages\\results\\Results.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add imports
content = content.replace(
  'import CustomSelect from "../../components/CustomSelect";',
  'import CustomSelect from "../../components/CustomSelect";\nimport MultiSelectChecklist from "../../components/MultiSelectChecklist";\nimport { useBatchOptions } from "../../hooks/useBatchOptions";'
);

// 2. Add state
const oldState = `  const [batchFilter, setBatchFilter] = useState<string>(
    () => queryBatch || "All"
  );`;

const newState = `  const [batchFilter, setBatchFilter] = useState<string>(
    () => queryBatch || "All"
  );
  const [selectedBatches, setSelectedBatches] = useState<string[]>(() => queryBatch && queryBatch !== "All" ? [queryBatch] : []);
  const { options: globalBatchOptions, loading: batchesLoading } = useBatchOptions();`;

content = content.replace(oldState, newState);

// 3. Update filteredResults
const oldBatchMatch = `      const batchMatch =
        batchFilter === "All" || cleanB === batchFilter || result.batch === batchFilter;`;

const newBatchMatch = `      const batchMatch =
        (batchFilter === "All" || cleanB === batchFilter || result.batch === batchFilter) &&
        (selectedBatches.length === 0 || selectedBatches.includes(cleanB) || selectedBatches.includes(result.batch));`;

content = content.replace(oldBatchMatch, newBatchMatch);

// 4. Update dependencies
content = content.replace(
  '[baseResults, search, batchFilter, assessmentFilter]',
  '[baseResults, search, batchFilter, selectedBatches, assessmentFilter]'
);

// 5. Replace CustomSelect with MultiSelectChecklist
const oldBatchUI = `          {/* Batches Dropdown */}
          <div className="w-full lg:w-48">
            <CustomSelect
              value={batchFilter}
              onChange={handleBatchChange}
              options={[
                { value: "All", label: "All Batches" },
                ...batches.map((b) => ({ value: b, label: b })),
              ]}
            />
          </div>`;

const newBatchUI = `          {/* Batches Dropdown */}
          <div className="w-full lg:w-52">
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
              disabled={batchesLoading}
            />
          </div>`;

content = content.replace(oldBatchUI, newBatchUI);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Results.tsx updated with MultiSelectChecklist');
