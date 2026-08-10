"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  FileUp,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getHealth } from "@/lib/api";

const scoringWeights = [
  ["Price", 35],
  ["Technical compliance", 30],
  ["Delivery", 15],
  ["Warranty", 10],
  ["Payment terms", 5],
  ["Support", 5],
] as const;

const currencyOptions = [
  ["PKR", "Pakistani Rupee"],
  ["USD", "US Dollar"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
] as const;

export function SettingsPanel() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const [connection, setConnection] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [defaultCurrency, setDefaultCurrency] = useState("PKR");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const checkConnection = useCallback(async () => {
    setConnection("checking");
    try {
      await getHealth();
      setConnection("connected");
    } catch {
      setConnection("disconnected");
    }
  }, []);

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem("bidsight-default-currency");
    const timer = window.setTimeout(() => {
      if (currencyOptions.some(([code]) => code === savedCurrency)) {
        setDefaultCurrency(savedCurrency ?? "PKR");
      }
      void checkConnection();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkConnection]);

  function saveCurrency(value: string) {
    setDefaultCurrency(value);
    window.localStorage.setItem("bidsight-default-currency", value);
  }

  async function copyApiUrl() {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                  <Database className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <CardTitle>API connection</CardTitle>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Live connection used for evaluations, quotation processing, and scoring.
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  connection === "connected"
                    ? "success"
                    : connection === "checking"
                      ? "muted"
                      : "warning"
                }
              >
                {connection === "connected"
                  ? "Connected"
                  : connection === "checking"
                    ? "Checking"
                    : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="api-url">Backend URL</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="api-url" value={apiUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={() => void copyApiUrl()}>
                  {copyState === "copied" ? <Check /> : <Copy />}
                  {copyState === "copied" ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" onClick={() => void checkConnection()} disabled={connection === "checking"}>
                  <RefreshCw className={connection === "checking" ? "animate-spin" : ""} />
                  Test connection
                </Button>
              </div>
              {copyState === "failed" && (
                <p className="text-xs text-red-600">The URL could not be copied automatically.</p>
              )}
              <p className="text-xs text-slate-500">
                Loaded from <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_API_URL</code>.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Default currency</Label>
                <span className="text-[11px] font-medium text-emerald-700">Saved on this device</span>
              </div>
              <Select value={defaultCurrency} onValueChange={saveCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(([code, label]) => (
                    <SelectItem key={code} value={code}>{code} — {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                New evaluations start with this currency; it can still be changed per evaluation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <Scale className="h-[18px] w-[18px]" />
              </span>
              <div>
                <CardTitle>Scoring model</CardTitle>
                <p className="mt-1.5 text-sm text-slate-500">
                  Deterministic weighting applied after mandatory compliance checks.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {scoringWeights.map(([label, weight]) => (
              <div key={label} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 sm:grid-cols-[180px_1fr_56px]">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <Progress value={weight * 2} className="h-2" />
                <span className="text-right text-sm font-semibold tabular-nums text-slate-700">{weight}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-semibold text-slate-700">Total weight</span>
              <span className="font-bold text-emerald-700">100%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" /> Evaluation controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {[
              "Mandatory gates run before weighted scoring",
              "AI cannot change verified numeric values",
              "Ineligible vendors cannot be recommended",
              "Missing information remains explicit",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-teal-700" /> Quotation policy
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-bold text-navy-950">3</p>
              <p className="mt-1 text-xs text-slate-500">PDFs per evaluation</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-bold text-navy-950">10 MB</p>
              <p className="mt-1 text-xs text-slate-500">Maximum per file</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
