import { useState } from "react";
import { FileText } from "lucide-react";
import { DocumentData, DocumentDialogProps } from "../../types";

export default function DocumentDialog({ onClose, onAdd }: DocumentDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentData["category"]>("Tickets");
  const [fileData, setFileData] = useState<{ url: string; name: string; type: string } | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      setError("File is too large (Max 900KB).");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setFileData({ url: result, name: file.name, type: file.type });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name || !fileData) {
      setError("Please provide a name and upload a file.");
      return;
    }
    onAdd({ name, category, fileUrl: fileData.url, fileName: fileData.name, fileType: fileData.type });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-serif text-stone-900 mb-6">Upload Document</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Document Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none"
              placeholder="e.g. Flight Confirmations"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:border-stone-900 outline-none bg-white cursor-pointer"
            >
              <option value="Tickets">Tickets</option>
              <option value="Reservations">Reservations</option>
              <option value="Insurance">Insurance</option>
              <option value="ID">IDs / Passports</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">File (PDF, Image)</label>
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                  fileData ? "border-emerald-500 bg-emerald-50" : "border-stone-300 hover:border-stone-400"
              }`}>
                  {fileData ? (
                      <div className="text-emerald-700 font-medium flex flex-col items-center">
                         <FileText size={32} className="mb-2" />
                         <span className="text-sm">{fileData.name}</span>
                      </div>
                  ) : (
                      <div className="text-stone-400 group-hover:text-stone-600">
                          <FileText size={32} className="mx-auto mb-2" />
                          <span className="text-sm font-medium">Click to upload</span>
                          <span className="block text-xs mt-1 opacity-70">Max 900KB</span>
                      </div>
                  )}
              </div>
            </div>
            {error && (
              <div className="text-rose-600 text-sm font-medium bg-rose-50 p-3 rounded-lg border border-rose-100 animate-in fade-in slide-in-from-bottom-2 mt-2">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-lg"
            >
              Upload
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-stone-200 text-stone-600 font-bold rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}