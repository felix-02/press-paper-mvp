import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  GripVertical,
  Mic,
  Square,
  Upload,
  X,
} from "lucide-react";
import { ReleaseFileList } from "@/components/release/ReleaseFiles";
import {
  fileGroups,
  MAX_CATEGORIES,
  type EditableAsset,
  type FileGroup,
} from "@/lib/releaseAssets";

export function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="pp-publish-label">
      <span>{children}</span>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function CategoryField({
  categories,
  onChange,
}: {
  categories: string[];
  onChange: (categories: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const category = draft.trim().replace(/\s+/g, " ");
    if (
      category &&
      categories.length < MAX_CATEGORIES &&
      !categories.some((item) => item.toLowerCase() === category.toLowerCase())
    ) {
      onChange([...categories, category]);
    }
    setDraft("");
  };
  return (
    <section>
      <FieldLabel hint="Optional">
        <label htmlFor="publish-category">Category</label>
      </FieldLabel>
      <div className="pp-publish-category pp-input">
        {categories.map((category) => (
          <span className="pp-publish-category-chip" key={category}>
            {category}
            <button
              type="button"
              onClick={() =>
                onChange(categories.filter((item) => item !== category))
              }
              aria-label={`Remove category ${category}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id="publish-category"
          value={draft}
          maxLength={40}
          disabled={categories.length >= MAX_CATEGORIES}
          placeholder={
            categories.length >= MAX_CATEGORIES
              ? "Category limit reached"
              : "Add a category"
          }
          list="publish-category-suggestions"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }}
        />
        <datalist id="publish-category-suggestions">
          {[
            "Economy",
            "Education",
            "Energy",
            "Environment",
            "Government",
            "Health",
            "Infrastructure",
            "Technology",
          ].map((category) => (
            <option value={category} key={category} />
          ))}
        </datalist>
        {draft.trim() && categories.length < MAX_CATEGORIES && (
          <button type="button" className="pp-btn pp-btn-outline" onClick={add}>
            Add
          </button>
        )}
      </div>
    </section>
  );
}

function UploadButton({
  group,
  label,
  onAdd,
  disabled,
}: {
  group: FileGroup;
  label: string;
  onAdd: (files: File[]) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className="pp-btn pp-btn-outline"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Upload size={14} /> {label}
      </button>
      <input
        ref={input}
        type="file"
        aria-label={label}
        accept={fileGroups[group].accept}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          onAdd(files);
        }}
      />
    </>
  );
}

function AudioRecorder({
  disabled,
  onAdd,
  onRecording,
  onError,
}: {
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRecording: (active: boolean) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "starting" | "recording">(
    "idle"
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const start = async () => {
    setStatus("starting");
    onRecording(true);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      const chunks: Blob[] = [];
      let bytes = 0;
      let tooLarge = false;
      let failed = false;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        bytes += event.data.size;
        if (bytes <= 20 * 1024 * 1024) chunks.push(event.data);
        else {
          tooLarge = true;
          if (recorder.state !== "inactive") recorder.stop();
        }
      };
      recorder.onerror = () => {
        failed = true;
      };
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        if (!mounted.current) return;
        setStatus("idle");
        onRecording(false);
        if (tooLarge || failed) {
          onError(
            tooLarge
              ? "Recordings can be up to 20 MB. Try a shorter recording."
              : "The recording stopped unexpectedly. Try again."
          );
          return;
        }
        const type = recorder.mimeType.split(";")[0];
        const extension =
          type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm";
        onAdd([new File(chunks, `Audio recording.${extension}`, { type })]);
      };
      recorder.start(1000);
      setStatus("recording");
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      setStatus("idle");
      onRecording(false);
      onError(
        "Couldn't start recording. Check microphone permission and try again."
      );
    }
  };

  if (
    typeof MediaRecorder === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  )
    return null;
  return (
    <button
      type="button"
      className="pp-btn pp-btn-outline"
      disabled={status === "starting" || (status === "idle" && disabled)}
      onClick={() =>
        status === "recording" ? recorderRef.current?.stop() : void start()
      }
    >
      {status === "recording" ? <Square size={13} /> : <Mic size={14} />}
      {status === "recording"
        ? "Stop recording"
        : status === "starting"
        ? "Waiting for microphone…"
        : "Record"}
    </button>
  );
}

export function PublishFiles({
  files,
  urls,
  recording,
  onRecording,
  onAdd,
  onRemove,
  onMove,
  onChange,
  onError,
  covers,
}: {
  files: EditableAsset[];
  urls: Record<string, string>;
  recording: boolean;
  onRecording: (active: boolean) => void;
  onAdd: (group: FileGroup, items: File[]) => void;
  onRemove: (path: string) => void;
  onMove: (from: string, to: string) => void;
  onChange: (
    path: string,
    changes: Pick<EditableAsset, "alt" | "transcript">
  ) => void;
  onError: (message: string) => void;
  covers: ReactNode;
}) {
  const media = files.filter(
    (file) => file.kind === "image" || file.kind === "video"
  );
  const audio = files.filter((file) => file.kind === "audio");
  const documents = files.filter((file) => file.kind === "document");
  const remove = (file: EditableAsset) => (
    <button
      type="button"
      className="pp-file-icon-button"
      title={`Remove ${file.name}`}
      aria-label={`Remove ${file.name}`}
      onClick={() => onRemove(file.path)}
    >
      <X size={15} />
    </button>
  );
  return (
    <>
      <section>
        <FieldLabel hint="Optional">Media</FieldLabel>
        {media.length > 0 && (
          <>
            <div className="pp-publish-media">
              {media.map((file, index) => (
                <div
                  key={file.path}
                  className="pp-publish-media-item"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onMove(event.dataTransfer.getData("text/plain"), file.path);
                  }}
                >
                  <div
                    className="pp-publish-thumbnail"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", file.path);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    {urls[file.path] &&
                      (file.kind === "image" ? (
                        <img
                          src={urls[file.path]}
                          alt={file.alt || file.name}
                          draggable={false}
                        />
                      ) : (
                        <video
                          src={urls[file.path]}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ))}
                    {file.kind === "video" && (
                      <Film
                        className="pp-publish-video-icon"
                        size={22}
                        aria-label="Video"
                      />
                    )}
                    {index === 0 && (
                      <span className="pp-publish-cover-badge">Cover</span>
                    )}
                    {remove(file)}
                  </div>
                  <div className="pp-publish-media-tools">
                    <span title={file.name}>{file.name}</span>
                    <button
                      type="button"
                      className="pp-file-icon-button"
                      aria-label={`Move ${file.name} earlier`}
                      disabled={index === 0}
                      onClick={() => onMove(file.path, media[index - 1].path)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      className="pp-file-icon-button"
                      aria-label={`Move ${file.name} later`}
                      disabled={index === media.length - 1}
                      onClick={() => onMove(file.path, media[index + 1].path)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  {file.kind === "image" && (
                    <input
                      className="pp-input pp-publish-alt"
                      aria-label={`Alt text for ${file.name}`}
                      value={file.alt ?? ""}
                      onChange={(event) =>
                        onChange(file.path, { alt: event.target.value })
                      }
                      maxLength={250}
                      placeholder="Alt text"
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="pp-publish-hint">
              <GripVertical size={13} /> Drag or use the arrows to reorder. The
              first item is the cover.
            </p>
          </>
        )}
        <div className="pp-publish-file-actions">
          <UploadButton
            group="media"
            label="Add photos or videos"
            onAdd={(items) => onAdd("media", items)}
            disabled={media.length >= fileGroups.media.limit}
          />
          <span>JPEG, PNG, WebP, MP4 or MOV</span>
        </div>
        {media.length === 0 && covers}
      </section>
      <section>
        <FieldLabel hint="Optional">Audio</FieldLabel>
        <ReleaseFileList
          files={audio}
          urls={urls}
          actions={remove}
          showTranscripts={false}
        />
        {audio.map((file) => (
          <details className="pp-publish-transcript" key={file.path}>
            <summary>
              {file.transcript ? "Edit transcript" : "Add transcript"} ·{" "}
              {file.name}
            </summary>
            <textarea
              className="pp-input"
              aria-label={`Transcript for ${file.name}`}
              value={file.transcript ?? ""}
              rows={3}
              maxLength={5000}
              onChange={(event) =>
                onChange(file.path, { transcript: event.target.value })
              }
            />
          </details>
        ))}
        <div className="pp-publish-file-actions">
          <UploadButton
            group="audio"
            label="Upload audio"
            onAdd={(items) => onAdd("audio", items)}
            disabled={recording || audio.length >= fileGroups.audio.limit}
          />
          <AudioRecorder
            disabled={audio.length >= fileGroups.audio.limit}
            onAdd={(items) => onAdd("audio", items)}
            onRecording={onRecording}
            onError={onError}
          />
          <span>MP3, M4A or WAV</span>
        </div>
      </section>
      <section>
        <FieldLabel hint="Optional">Attachments</FieldLabel>
        <ReleaseFileList files={documents} urls={urls} actions={remove} />
        <div className="pp-publish-file-actions">
          <UploadButton
            group="documents"
            label="Add documents"
            onAdd={(items) => onAdd("documents", items)}
            disabled={documents.length >= fileGroups.documents.limit}
          />
          <span>PDF, Word, Excel, CSV or ODF</span>
        </div>
      </section>
    </>
  );
}
