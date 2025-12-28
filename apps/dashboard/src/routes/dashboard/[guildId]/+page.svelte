<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const services = [
		{ id: 'twitter', name: 'Twitter', description: 'twitter.com → vxtwitter.com' },
		{ id: 'x', name: 'X', description: 'x.com → vxtwitter.com' },
		{ id: 'tiktok', name: 'TikTok', description: 'tiktok.com → vxtiktok.com' },
		{ id: 'instagram', name: 'Instagram', description: 'instagram.com → ddinstagram.com' },
		{ id: 'reddit', name: 'Reddit', description: 'reddit.com → vxreddit.com' }
	];

	function getIconUrl(guildId: string, icon: string | null): string {
		if (!icon) {
			return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(guildId) >> 22n) % 6}.png`;
		}
		return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`;
	}

	let saving = $state(false);
</script>

<div class="header">
	<a href="/dashboard" class="back">← Back to servers</a>
	<div class="guild-header">
		<img src={getIconUrl(data.guild.id, data.guild.icon)} alt={data.guild.name} class="guild-icon" />
		<div>
			<h1>{data.guild.name}</h1>
			<p class="guild-id">{data.guild.id}</p>
		</div>
	</div>
</div>

{#if form?.success}
	<div class="success">Settings saved</div>
{/if}

<form
	method="POST"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	<div class="services">
		<div class="section-header">
			<h2>Services</h2>
			<p>Toggle which embed services are active</p>
		</div>

		{#each services as service, i}
			<label class="service-toggle" style="animation-delay: {i * 0.05}s">
				<div class="service-info">
					<span class="service-name">{service.name}</span>
					<span class="service-desc">{service.description}</span>
				</div>
				<input
					type="checkbox"
					name={service.id}
					checked={data.settings[service.id]}
				/>
				<span class="toggle">
					<span class="toggle-label">{data.settings[service.id] ? 'ON' : 'OFF'}</span>
				</span>
			</label>
		{/each}
	</div>

	<button type="submit" class="save-btn" disabled={saving}>
		{saving ? 'Saving...' : 'Save Settings'}
	</button>
</form>

<style>
	.header {
		margin-bottom: 3rem;
	}

	.back {
		font-size: 0.7rem;
		color: var(--fg-dim);
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		transition: color 0.2s;
	}

	.back:hover {
		color: var(--fg);
	}

	.guild-header {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin-top: 1.5rem;
	}

	.guild-icon {
		width: 64px;
		height: 64px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.05);
	}

	h1 {
		font-family: 'Instrument Serif', serif;
		font-size: 1.75rem;
		font-weight: 400;
		margin: 0 0 0.25rem;
	}

	.guild-id {
		font-size: 0.7rem;
		color: var(--fg-dim);
		margin: 0;
		opacity: 0.6;
	}

	.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.2);
		color: #22c55e;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.services {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 1.5rem;
	}

	.section-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.section-header h2 {
		font-family: 'Instrument Serif', serif;
		font-size: 1.25rem;
		font-weight: 400;
		margin: 0 0 0.25rem;
	}

	.section-header p {
		font-size: 0.8rem;
		color: var(--fg-dim);
		margin: 0;
	}

	.service-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		cursor: pointer;
		opacity: 0;
		animation: fadeIn 0.4s ease forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.service-toggle:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}

	.service-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.service-name {
		font-size: 0.9rem;
	}

	.service-desc {
		font-size: 0.75rem;
		color: var(--fg-dim);
	}

	.service-toggle input {
		display: none;
	}

	.toggle {
		position: relative;
		width: 60px;
		height: 28px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: flex-start;
		padding: 0 8px;
		transition: all 0.2s;
	}

	.toggle-label {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--fg-dim);
		transition: all 0.2s;
	}

	.service-toggle input:checked + .toggle {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		justify-content: flex-end;
	}

	.service-toggle input:checked + .toggle .toggle-label {
		color: var(--fg);
	}

	.save-btn {
		margin-top: 1.5rem;
		padding: 1rem 2rem;
		font-family: 'Space Mono', monospace;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--fg);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.save-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
