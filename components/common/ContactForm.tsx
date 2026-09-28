"use client";

export default function ContactForm() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="rounded-xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="mt-6">
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Your phone number"
        />
      </div>
      <div className="mt-6">
        <label htmlFor="message" className="block text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="mt-2 block w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="How can we help you?"
        />
      </div>
      <div className="mt-6">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
        >
          Send Message
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">
        This form is currently for demonstration purposes only. Message submission
        will be connected to a backend in a future phase.
      </p>
    </form>
  );
}
