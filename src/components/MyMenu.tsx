"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FolderGit2,
  KeyRound,
  LogOut,
  Upload,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useResource } from "./resource";
import { useSignOut } from "./SignOut";
import { Settings } from "./Settings";
import { api } from "@/lib/client";
import type { AccountIdentity } from "@/lib/account-avatar";
import { prepareAvatar } from "@/lib/prepare-avatar";
import styles from "./MyMenu.module.css";

const Import = dynamic(() => import("./Import").then((module) => module.Import), {
  loading: () => <p role="status">正在打开…</p>,
});

type Panel = "profile" | "tools" | "excel" | null;
export function AccountMenu() {
  const account = useResource<AccountIdentity>("account");
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const { signOut, error, busy } = useSignOut();
  const avatar = account.data?.avatar;
  const name = account.data?.name ?? "我的账号";
  const show = (value: Panel) => {
    setOpen(false);
    setPanel(value);
  };
  const portrait = (large = false) => (
    <span className={`${styles.avatar} ${large ? styles.large : ""}`}>
      {/* Uploaded raster thumbnails are served inline; no third-party avatar request. */}
      {avatar ? (
        <img
          src={avatar}
          alt=""
          width={large ? 64 : 32}
          height={large ? 64 : 32}
        />
      ) : (
        <UserRound size={large ? 28 : 20} aria-hidden="true" />
      )}
    </span>
  );
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className="header-icon-button account-trigger"
            aria-label="我的"
            title="我的"
          >
            {portrait()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={styles.menu}
          aria-label="我的菜单"
          align="end"
          sideOffset={8}
        >
          <div className={styles.identity}>
            {portrait()}
            <div>
              <strong>{name}</strong>
              <span>{account.data?.email}</span>
            </div>
          </div>
          <DropdownMenuSeparator className={styles.separator} />
          <DropdownMenuItem
            className={styles.item}
            onSelect={() => show("profile")}
          >
            <UserRound size={16} />
            个人资料与偏好
          </DropdownMenuItem>
          <DropdownMenuItem
            className={styles.item}
            onSelect={() => show("tools")}
          >
            <Database size={16} />
            数据工具
            <ChevronRight size={14} className={styles.chevron} />
          </DropdownMenuItem>
          <DropdownMenuItem className={styles.item} asChild>
            <Link href="/auth?mode=reset">
              <KeyRound size={16} />
              修改密码
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className={styles.separator} />
          <DropdownMenuItem className={styles.item} asChild>
            <a
              href="https://github.com/kuizsweet/Fitness-log"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FolderGit2 size={16} aria-hidden="true" />
              GitHub 仓库
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={styles.item}
            disabled={busy}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            <LogOut size={16} />
            {busy ? "正在退出…" : "退出登录"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
      <Dialog
        open={panel !== null}
        onOpenChange={(value) => {
          if (!value) {
            setPanel(null);
            account.reload();
          }
        }}
      >
        <DialogContent
          className={`${styles.panel} ${panel === "excel" ? styles.wide : ""}`}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {panel === "profile"
                ? "个人资料与偏好"
                : panel === "excel"
                  ? "Excel 导入"
                  : "数据工具"}
            </DialogTitle>
          </DialogHeader>
          {panel === "profile" && (
            <>
              <div className={styles.profile}>
                {portrait(true)}
                <div>
                  <strong>{name}</strong>
                  <p>{account.data?.email}</p>
                  <label className={styles.upload}>
                    <Upload size={14} />
                    {uploading ? "正在上传…" : "上传头像"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        setUploading(true);
                        setUploadError("");
                        try {
                          const avatar = await prepareAvatar(file);
                          await api("account", { avatar });
                          account.reload();
                        } catch (error) {
                          setUploadError((error as Error).message);
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              {uploadError && <p role="alert">{uploadError}</p>}
              <Settings embedded />
            </>
          )}
          {panel === "tools" && (
            <button className={styles.tool} onClick={() => setPanel("excel")}>
              <FileSpreadsheet size={20} />
              <span>Excel 导入</span>
              <ChevronRight size={16} />
            </button>
          )}
          {panel === "excel" && (
            <>
              <button className={styles.back} onClick={() => setPanel("tools")}>
                <ArrowLeft size={16} />
                数据工具
              </button>
              <Import embedded />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
