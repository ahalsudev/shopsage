import { AppExternalLink, AppExternalLinkProps } from '@/components/app-external-link'
import { AppText } from '@/components/app-text'
import { AppView } from '@/components/app-view'

export function SettingsAppConfig() {
  return (
    <AppView>
      <AppText type="subtitle">App Config</AppText>
      <AppText type="default">
        Name <AppText type="defaultSemiBold">shopsage-mobile</AppText>
      </AppText>
      <AppText type="default">
        URL{' '}
        <AppText type="link">
          <AppExternalLink href={'https://shopsage.site' as AppExternalLinkProps['href']}>
            https://shopsage.site
          </AppExternalLink>
        </AppText>
      </AppText>
    </AppView>
  )
}
