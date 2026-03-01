import { useEffect, useRef } from "react";
import { useAdminAuthStore } from "../stores/useAdminAuthStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";

export const Logout = () => {
    const navigate = useNavigate();
    const { logout } = useAdminAuthStore();
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;

        (async () => {
            await logout();
            toast.success(
                <div>
                    <h2 className="text-primary">Signed out successfully</h2>
                </div>
            );
            navigate("/login", { replace: true });
        })();
    }, [logout, navigate]);


    return (
        <div
            role="status"
            aria-live="polite"
            className="min-h-[60vh] flex items-center justify-center flex-col gap-3 p-4 text-center"
        >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="flex items-center gap-4">
                    <Spinner className="text-destructive text-2xl size-6" />
                </div>
                <div style={{ textAlign: "left" }}>
                    <h2 className="text-xl text-destructive">Signing out…</h2>
                    <p className="text-muted-foreground">You will be redirected to the login page shortly.</p>
                </div>
            </div>
        </div>
    )
}