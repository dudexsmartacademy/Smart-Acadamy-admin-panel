const fs = require('fs');
const filePath = 'D:\\dudex-teacher-portal\\src\\pages\\notes\\Notes.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add imports
content = content.replace(
  'import CustomSelect from "../../components/CustomSelect";',
  'import CustomSelect from "../../components/CustomSelect";\nimport MultiSelectChecklist from "../../components/MultiSelectChecklist";\nimport { useBatchOptions } from "../../hooks/useBatchOptions";'
);

// 2. Add state and replace batchOptions
const oldStateBlock = `  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("All");

  const [statusFilter, setStatusFilter] =
    useState<"All" | NoteStatus>("All");`;

const newStateBlock = `  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const { options: globalBatchOptions, loading: batchesLoading } = useBatchOptions();

  const [statusFilter, setStatusFilter] =
    useState<"All" | NoteStatus>("All");`;

content = content.replace(oldStateBlock, newStateBlock);

// 3. Remove old batchOptions useMemo
const oldBatchMemo = `  // Batch filter options come from the batches the notes were published to.
  const batchOptions = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.className.split(", ").forEach((b) => b && set.add(b)));
    return [
      { value: "All", label: "All Batches" },
      ...Array.from(set).sort().map((b) => ({ value: b, label: b })),
    ];
  }, [notes]);`;

content = content.replace(oldBatchMemo, '');

// 4. Update filtering
const oldFilterBlock = `      const matchesBatch =
        batchFilter === "All" ||
        note.className.split(", ").includes(batchFilter);`;

const newFilterBlock = `      const matchesBatch =
        selectedBatches.length === 0 ||
        selectedBatches.some((b) => note.className.split(", ").map((s) => s.trim()).includes(b));`;

content = content.replace(oldFilterBlock, newFilterBlock);

// 5. Replace CustomSelect with MultiSelectChecklist in UI
const oldSelectUI = `          {/* Batch Filter */}
          <div className="w-full md:w-44">
            <CustomSelect
              value={batchFilter}
              onChange={(val) => setBatchFilter(val)}
              options={batchOptions}
            />
          </div>`;

const newSelectUI = `          {/* Batch Filter */}
          <div className="w-full md:w-52">
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
              disabled={batchesLoading}
            />
          </div>`;

content = content.replace(oldSelectUI, newSelectUI);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Notes.tsx successfully updated with MultiSelectChecklist and global batches');
