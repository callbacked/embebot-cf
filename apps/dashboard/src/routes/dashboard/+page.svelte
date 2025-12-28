<script lang="ts">
	let { data } = $props();

	function getIconUrl(guildId: string, icon: string | null): string {
		if (!icon) {
			return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(guildId) >> 22n) % 6}.png`;
		}
		return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`;
	}

	function getAvatarUrl(userId: string, avatar: string | null): string {
		if (!avatar) {
			return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`;
		}
		return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
	}
</script>

<div class="page">
	<div class="top-bar">
		<a href="/" class="back">← home</a>
		<div class="user-info">
			<span class="username">{data.user.username}</span>
			<img src={getAvatarUrl(data.user.id, data.user.avatar)} alt="" class="user-avatar" />
			<a href="/auth/logout" class="logout">logout</a>
		</div>
	</div>
	<p class="subtitle">select a server to configure</p>

	{#if data.guilds.length === 0}
		<div class="empty">
			<p>no servers found where you have admin permissions</p>
			<p>make sure the bot is added to a server where you're an admin</p>
		</div>
	{:else}
		<div class="guilds">
			{#each data.guilds as guild, i}
				<a href="/dashboard/{guild.id}" class="guild-card" style="animation-delay: {i * 0.04}s">
					<div class="guild-icon-wrap">
						<img src={getIconUrl(guild.id, guild.icon)} alt={guild.name} class="guild-icon" />
						{#if guild.hasBot}
							<span class="bot-badge" title="bot active"></span>
						{/if}
					</div>
					<span class="guild-name">{guild.name}</span>
					<span class="arrow">→</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
		padding-top: 2rem;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
	}

	.back {
		font-size: 0.75rem;
		color: var(--fg-dim);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.back:hover {
		color: var(--fg);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.username {
		font-size: 0.75rem;
		color: var(--fg-dim);
	}

	.user-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
	}

	.logout {
		font-size: 0.7rem;
		color: var(--fg-dim);
		text-decoration: none;
		opacity: 0.6;
		transition: opacity 0.2s ease;
	}

	.logout:hover {
		opacity: 1;
	}

	.subtitle {
		font-size: 0.85rem;
		color: var(--fg-dim);
		margin-bottom: 2rem;
	}

	.empty {
		text-align: center;
		padding: 3rem;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}

	.empty p {
		color: var(--fg-dim);
		font-size: 0.85rem;
		margin: 0.5rem 0;
	}

	.guilds {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.guild-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
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

	.guild-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.guild-icon-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.guild-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.05);
	}

	.bot-badge {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 12px;
		height: 12px;
		background: #22c55e;
		border-radius: 50%;
		border: 2px solid var(--bg);
	}

	.guild-name {
		flex: 1;
		font-size: 0.95rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.arrow {
		color: var(--fg-dim);
		font-size: 1.1rem;
		transition: transform 0.2s ease, color 0.2s ease;
	}

	.guild-card:hover .arrow {
		color: var(--fg);
		transform: translateX(4px);
	}
</style>
