<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	const services: Array<{ id: keyof typeof data.defaults; name: string; source: string }> = [
		{ id: 'twitter', name: 'twitter', source: 'twitter.com' },
		{ id: 'x', name: 'x', source: 'x.com' },
		{ id: 'tiktok', name: 'tiktok', source: 'tiktok.com' },
		{ id: 'instagram', name: 'instagram', source: 'instagram.com' },
		{ id: 'reddit', name: 'reddit', source: 'reddit.com' }
	];

	function getIconUrl(guildId: string, icon: string | null): string {
		if (!icon) {
			return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(guildId) >> 22n) % 6}.png`;
		}
		return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`;
	}

	let saving = $state(false);

	// Track endpoint values for reset functionality
	let endpointOverrides = $state<Record<string, string>>({});

	function getEndpoint(serviceId: keyof typeof data.defaults): string {
		return endpointOverrides[serviceId] ?? data.endpoints[serviceId];
	}

	function setEndpoint(serviceId: keyof typeof data.defaults, value: string) {
		endpointOverrides[serviceId] = value;
	}

	function resetEndpoint(serviceId: keyof typeof data.defaults) {
		endpointOverrides[serviceId] = data.defaults[serviceId];
	}

	function isCustom(serviceId: keyof typeof data.defaults): boolean {
		const value = getEndpoint(serviceId);
		return value !== data.defaults[serviceId] && value !== '';
	}
</script>

<div class="page">
	<a href="/dashboard" class="back">← servers</a>

	<div class="guild-header">
		<img src={getIconUrl(data.guild.id, data.guild.icon)} alt={data.guild.name} class="guild-icon" />
		<span class="guild-name">{data.guild.name}</span>
	</div>

	{#if form?.success}
		<div class="success">saved</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				endpointOverrides = {};
				saving = false;
			};
		}}
	>
		<div class="services">
			{#each services as service, i}
				<div class="service-row" style="animation-delay: {i * 0.04}s">
					<label class="service-toggle">
						<div class="service-info">
							<span class="service-name">{service.name}</span>
							<span class="service-transform">{service.source} →</span>
						</div>
						<input
							type="checkbox"
							name={service.id}
							checked={data.settings[service.id]}
						/>
						<span class="toggle"></span>
					</label>
					<div class="endpoint-row">
						<input
							type="text"
							name="{service.id}Endpoint"
							value={getEndpoint(service.id)}
							oninput={(e) => setEndpoint(service.id, e.currentTarget.value)}
							placeholder={data.defaults[service.id]}
							class="endpoint-input"
						/>
						{#if isCustom(service.id)}
							<button
								type="button"
								class="reset-btn"
								onclick={() => resetEndpoint(service.id)}
								title="reset to default"
							>
								×
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<button type="submit" class="save-btn" disabled={saving}>
			{saving ? 'saving...' : 'save'}
		</button>
	</form>
</div>

<style>
	.page {
		max-width: 500px;
		margin: 0 auto;
		padding-top: 2rem;
	}

	.back {
		display: inline-block;
		font-size: 0.75rem;
		color: var(--fg-dim);
		text-decoration: none;
		margin-bottom: 2rem;
		transition: color 0.2s ease;
	}

	.back:hover {
		color: var(--fg);
	}

	.guild-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.guild-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
	}

	.guild-name {
		font-size: 1.1rem;
	}

	.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.2);
		color: #22c55e;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.75rem;
		border-radius: 6px;
	}

	.services {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.service-row {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 1rem;
		opacity: 0;
		animation: fadeIn 0.3s ease forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.service-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		margin-bottom: 0.75rem;
	}

	.service-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.service-name {
		font-size: 0.9rem;
	}

	.service-transform {
		font-size: 0.7rem;
		color: var(--fg-dim);
	}

	.service-toggle input {
		display: none;
	}

	.toggle {
		width: 36px;
		height: 20px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		position: relative;
		transition: background 0.2s ease;
	}

	.toggle::after {
		content: '';
		position: absolute;
		width: 14px;
		height: 14px;
		background: var(--fg-dim);
		border-radius: 50%;
		top: 3px;
		left: 3px;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.service-toggle input:checked + .toggle {
		background: rgba(34, 197, 94, 0.3);
	}

	.service-toggle input:checked + .toggle::after {
		transform: translateX(16px);
		background: #22c55e;
	}

	.endpoint-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.endpoint-input {
		flex: 1;
		padding: 0.6rem 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		color: var(--fg);
		font-family: 'Space Mono', monospace;
		font-size: 0.8rem;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.endpoint-input:focus {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.endpoint-input::placeholder {
		color: var(--fg-dim);
		opacity: 0.5;
	}

	.reset-btn {
		width: 28px;
		height: 28px;
		padding: 0;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: var(--fg-dim);
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.reset-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--fg);
	}

	.save-btn {
		margin-top: 1.5rem;
		width: 100%;
		padding: 0.875rem;
		font-family: 'Space Mono', monospace;
		font-size: 0.8rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		color: var(--fg);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.save-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
