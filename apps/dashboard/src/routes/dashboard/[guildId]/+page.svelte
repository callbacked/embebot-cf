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
	let addingCustom = $state(false);
	let newMatchDomain = $state('');
	let newReplaceDomain = $state('');
	let customError = $state('');

	const BUILTIN_DOMAINS = ['twitter.com', 'x.com', 'tiktok.com', 'instagram.com', 'reddit.com'];

	// Validate domain format
	function isValidDomain(input: string): boolean {
		const domain = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
		if (!domain || domain.length < 3 || !domain.includes('.')) return false;
		// Basic domain pattern: alphanumeric, dots, hyphens
		return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain);
	}

	function isBuiltinDomain(input: string): boolean {
		const domain = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
		return BUILTIN_DOMAINS.some((b) => domain === b || domain.endsWith('.' + b));
	}

	function canAddCustom(): boolean {
		return isValidDomain(newMatchDomain) && isValidDomain(newReplaceDomain) && !isBuiltinDomain(newMatchDomain);
	}

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

	<div class="custom-services-section">
		<h3>custom services</h3>
		<p class="section-desc">add your own domain replacements</p>

		{#if data.customServices.length > 0}
			<div class="custom-services-list">
				{#each data.customServices as service}
					<div class="custom-service-row">
						<div class="custom-service-info">
							<span class="custom-service-match">{service.matchDomain}</span>
							<span class="custom-service-arrow">→</span>
							<span class="custom-service-replace">{service.replaceDomain}</span>
						</div>
						<div class="custom-service-actions">
							<form
								method="POST"
								action="?/toggleCustomService"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="matchDomain" value={service.matchDomain} />
								<input type="hidden" name="enabled" value={!service.enabled} />
								<button type="submit" class="toggle-btn" class:enabled={service.enabled}>
									{service.enabled ? 'on' : 'off'}
								</button>
							</form>
							<form
								method="POST"
								action="?/deleteCustomService"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="matchDomain" value={service.matchDomain} />
								<button type="submit" class="delete-btn" title="delete">×</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if addingCustom}
			<form
				method="POST"
				action="?/addCustomService"
				class="add-custom-form"
				use:enhance={() => {
					customError = '';
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data && 'error' in result.data) {
							customError = String(result.data.error);
						} else {
							await update();
							await invalidateAll();
							newMatchDomain = '';
							newReplaceDomain = '';
							addingCustom = false;
						}
					};
				}}
			>
				<div class="add-custom-inputs">
					<input
						type="text"
						name="matchDomain"
						bind:value={newMatchDomain}
						placeholder="pixiv.net"
						class="custom-input"
						class:invalid={newMatchDomain.length > 0 && (!isValidDomain(newMatchDomain) || isBuiltinDomain(newMatchDomain))}
					/>
					<span class="add-arrow">→</span>
					<input
						type="text"
						name="replaceDomain"
						bind:value={newReplaceDomain}
						placeholder="phixiv.net"
						class="custom-input"
						class:invalid={newReplaceDomain.length > 0 && !isValidDomain(newReplaceDomain)}
					/>
				</div>
				{#if isBuiltinDomain(newMatchDomain)}
					<p class="custom-error">this domain is already handled above</p>
				{:else if customError}
					<p class="custom-error">{customError}</p>
				{/if}
				<div class="add-custom-buttons">
					<button type="submit" class="add-confirm-btn" disabled={!canAddCustom()}>add</button>
					<button type="button" class="add-cancel-btn" onclick={() => { addingCustom = false; customError = ''; }}
						>cancel</button
					>
				</div>
			</form>
		{:else}
			<button class="add-custom-btn" onclick={() => (addingCustom = true)}>+ add custom service</button
			>
		{/if}
	</div>
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

	/* Custom Services Section */
	.custom-services-section {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.custom-services-section h3 {
		font-size: 0.9rem;
		font-weight: 400;
		margin: 0 0 0.25rem 0;
	}

	.section-desc {
		font-size: 0.7rem;
		color: var(--fg-dim);
		margin: 0 0 1rem 0;
	}

	.custom-services-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.custom-service-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		padding: 0.75rem 1rem;
	}

	.custom-service-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.custom-service-match {
		color: var(--fg);
	}

	.custom-service-arrow {
		color: var(--fg-dim);
	}

	.custom-service-replace {
		color: var(--fg-dim);
	}

	.custom-service-actions {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.7rem;
		font-family: 'Space Mono', monospace;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: var(--fg-dim);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn.enabled {
		background: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.toggle-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.delete-btn {
		width: 24px;
		height: 24px;
		padding: 0;
		font-size: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: var(--fg-dim);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.delete-btn:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.add-custom-btn {
		width: 100%;
		padding: 0.75rem;
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		background: transparent;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: var(--fg-dim);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-custom-btn:hover {
		border-color: rgba(255, 255, 255, 0.2);
		color: var(--fg);
	}

	.add-custom-form {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		padding: 1rem;
	}

	.add-custom-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.custom-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		color: var(--fg);
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		outline: none;
	}

	.custom-input:focus {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.custom-input.invalid {
		border-color: rgba(239, 68, 68, 0.4);
	}

	.custom-input::placeholder {
		color: var(--fg-dim);
		opacity: 0.5;
	}

	.custom-error {
		font-size: 0.7rem;
		color: #ef4444;
		margin: 0 0 0.5rem 0;
	}

	.add-arrow {
		color: var(--fg-dim);
		font-size: 0.8rem;
	}

	.add-custom-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.add-confirm-btn,
	.add-cancel-btn {
		flex: 1;
		padding: 0.5rem;
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-confirm-btn {
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.add-confirm-btn:hover:not(:disabled) {
		background: rgba(34, 197, 94, 0.25);
	}

	.add-confirm-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.add-cancel-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--fg-dim);
	}

	.add-cancel-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
</style>
