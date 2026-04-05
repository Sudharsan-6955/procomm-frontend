import { redirect } from "next/navigation";

export default function ChatByIdPage({ params }) {
	const { chatId } = params;
	redirect(`/chat?chatId=${chatId}`);
}
