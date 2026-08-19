import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f7f6] px-4 py-8">
      <Card className="w-full max-w-lg border border-[#dce8e5] bg-white shadow-[0_24px_60px_-38px_rgba(16,58,58,.55)]">
        <CardContent className="pt-9 pb-9 text-center sm:pt-11 sm:pb-11">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#508078]">HEDGE LAB / recuperação de rota</p>
          <div className="mt-6 flex justify-center">
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-[#f0d2bc] bg-[#fff7ee]">
              <AlertCircle className="h-8 w-8 text-[#b55f2a]" />
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#17363e]">404</h1>

          <h2 className="mt-2 text-xl font-semibold text-[#24454d]">
            Página não encontrada
          </h2>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#668087]">
            A página solicitada não existe, foi movida ou não está disponível.
          </p>

          <div
            id="not-found-button-group"
            className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Button
              onClick={handleGoHome}
              className="bg-[#173c45] px-6 py-2.5 text-white shadow-[0_12px_24px_-16px_rgba(15,60,69,.8)] hover:bg-[#24515a]"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
