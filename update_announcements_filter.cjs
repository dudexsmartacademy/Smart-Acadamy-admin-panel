const fs = require('fs');
const filePath = 'D:\\dudex-teacher-portal\\src\\pages\\announcements\\Announcements.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add MultiSelectChecklist import
content = content.replace(
  'import CustomSelect from "../../components/CustomSelect";',
  'import CustomSelect from "../../components/CustomSelect";\nimport MultiSelectChecklist from "../../components/MultiSelectChecklist";'
);

// 2. Add selectedBatches state
content = content.replace(
  '  const [batchFilter, setBatchFilter] = useState("All");',
  '  const [batchFilter, setBatchFilter] = useState("All");\n  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);'
);

// 3. Update matchesBatch
const oldMatchesBatch = `        const matchesBatch =
          batchFilter === "All" ||
          (Array.isArray(announcement.batches) && announcement.batches.includes(batchFilter)) ||
          announcement.classId === batchFilter ||
          (announcement.className || "").toLowerCase().includes(batchFilter.toLowerCase());`;

const newMatchesBatch = `        const matchesBatch =
          (batchFilter === "All" ||
            (Array.isArray(announcement.batches) && announcement.batches.includes(batchFilter)) ||
            announcement.classId === batchFilter ||
            (announcement.className || "").toLowerCase().includes(batchFilter.toLowerCase())) &&
          (selectedBatches.length === 0 ||
            selectedBatches.some((b) =>
              (Array.isArray(announcement.batches) && announcement.batches.includes(b)) ||
              announcement.classId === b ||
              (announcement.className || "").toLowerCase().includes(b.toLowerCase())
            ));`;

content = content.replace(oldMatchesBatch, newMatchesBatch);

// 4. Update dependencies
content = content.replace(
  '      batchFilter,\n      statusFilter,',
  '      batchFilter,\n      selectedBatches,\n      statusFilter,'
);

// 5. Replace CustomSelect with MultiSelectChecklist
const oldBatchUI = `          {/* Batch Filter */}
          <CustomSelect
            value={batchFilter}
            onChange={(val) => setBatchFilter(val)}
            options={batchOptions}
          />`;

const newBatchUI = `          {/* Batch Filter */}
          <div className="w-full sm:w-48">
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
            />
          </div>`;

content = content.replace(oldBatchUI, newBatchUI);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Announcements.tsx updated with MultiSelectChecklist');
