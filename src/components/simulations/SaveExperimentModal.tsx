import React, { useState } from "react";
import { X, BookMarked, CheckCircle2, Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { saveUserExperiment } from "../../lib/firestoreService";
import { SimulationId } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSimId: SimulationId;
  simName: string;
  onSaved?: () => void;
}

export const SaveExperimentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSimId,
  simName,
  onSaved,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>(`${simName} Experiment Run`);
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setIsSaving(true);
    try {
      const id = "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      await saveUserExperiment(user.uid, {
        id,
        title: title.trim(),
        simType: currentSimId,
        parameters: {
          simId: currentSimId,
          timestamp: new Date().toISOString(),
        },
        notes: notes.trim() || undefined,
      });

      setIsSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to save experiment:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Save Simulation to Notebook
              </h3>
              <span className="text-[11px] text-slate-500">{simName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Saved in Your Notebook!</h4>
            <p className="text-xs text-slate-500">
              You can review, launch, and export this experiment from your Physics Notebook anytime.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Experiment Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., High-Angle Projectile Trajectory"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Scientific Observations & Notes (Optional):
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., At 45 degrees without drag, max theoretical range achieved. Observed resonance peaks at 2.3 rad/s."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !title.trim() || !user}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save to Notebook"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
