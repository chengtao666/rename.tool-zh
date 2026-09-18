import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { ConditionalShell } from "@/components/ConditionalShell";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { RegisterServiceWorker } from "@/components/ServiceWorkerRegistration";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UmamiAnalytics } from "@/components/UmamiAnalytics";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { generatePageMetadata } from "@/lib/metadata";
import "../globals.css";

type Props = {
	children: ReactNode;
	params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">) {
	const { locale } = await params;
	return generatePageMetadata({ locale });
}

export default async function LocaleLayout({ children, params }: Props) {
	const { locale } = await params;

	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}

	setRequestLocale(locale);
	const messages = await getMessages();

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<link rel="icon" href="/logo.svg" type="image/svg+xml" />
				<link rel="apple-touch-icon" href="/logo.svg" />
			</head>
			<body className="antialiased">
				<GoogleAnalytics />
				<UmamiAnalytics />
				<RegisterServiceWorker />
				<NextIntlClientProvider locale={locale} messages={messages}>
					<ThemeProvider>
						<ConditionalShell>{children}</ConditionalShell>
						<Toaster />
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
