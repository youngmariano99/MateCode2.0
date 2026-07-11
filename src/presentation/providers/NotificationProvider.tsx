"use client";

import React from "react";
import { ToastProvider } from "../components/toast";

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <ToastProvider>{children}</ToastProvider>;
};
