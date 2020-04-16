/**
 * External dependencies
 */
import {
	Platform,
	View,
	Text,
	Button,
	Modal,
	SafeAreaView,
	TouchableWithoutFeedback,
} from 'react-native';
import WebView from 'react-native-webview';

/**
 * WordPress dependencies
 */
import { BottomSheet, Icon } from '@wordpress/components';
import { withPreferredColorScheme } from '@wordpress/compose';
import { coreBlocks } from '@wordpress/block-library';
import { normalizeIconObject } from '@wordpress/blocks';
import { Component } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { help, plugins } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import styles from './style.scss';

export class UnsupportedBlockEdit extends Component {
	constructor( props ) {
		super( props );
		this.state = { showHelp: false, isModalVisible: false };
		this.toggleSheet = this.toggleSheet.bind( this );
		this.requestFallback = this.requestFallback.bind( this );
	}

	toggleSheet() {
		this.setState( {
			showHelp: ! this.state.showHelp,
		} );
	}

	componentWillUnmount() {
		if ( this.timeout ) {
			clearTimeout( this.timeout );
		}
	}

	renderHelpIcon() {
		const infoIconStyle = this.props.getStylesFromColorScheme(
			styles.infoIcon,
			styles.infoIconDark
		);

		return (
			<TouchableWithoutFeedback
				accessibilityLabel={ __( 'Help icon' ) }
				accessibilityRole={ 'button' }
				accessibilityHint={ __( 'Tap here to show help' ) }
				onPress={ this.toggleSheet }
			>
				<View style={ styles.helpIconContainer }>
					<Icon
						className="unsupported-icon-help"
						label={ __( 'Help icon' ) }
						icon={ help }
						color={ infoIconStyle.color }
					/>
				</View>
			</TouchableWithoutFeedback>
		);
	}

	requestFallback() {
		this.toggleSheet();
		this.setState( { sendFallbackMessage: true, isModalVisible: true } );
	}

	renderSheet( title ) {
		const { getStylesFromColorScheme, attributes } = this.props;
		const infoTextStyle = getStylesFromColorScheme(
			styles.infoText,
			styles.infoTextDark
		);
		const infoTitleStyle = getStylesFromColorScheme(
			styles.infoTitle,
			styles.infoTitleDark
		);
		const infoDescriptionStyle = getStylesFromColorScheme(
			styles.infoDescription,
			styles.infoDescriptionDark
		);
		const infoSheetIconStyle = getStylesFromColorScheme(
			styles.infoSheetIcon,
			styles.infoSheetIconDark
		);

		const titleFormat =
			Platform.OS === 'android'
				? // translators: %s: Name of the block
				  __( "'%s' isn't yet supported on WordPress for Android" )
				: // translators: %s: Name of the block
				  __( "'%s' isn't yet supported on WordPress for iOS" );
		const infoTitle = sprintf( titleFormat, title );

		const runFirst = `

		window.onSave = () => {
			const blocks = window.wp.data.select('core/block-editor').getBlocks();
			const HTML = window.wp.blocks.serialize( blocks );
			window.ReactNativeWebView.postMessage(HTML);
		}

		window.insertBlock = () => {
			window.setTimeout(() => {
                const blockHTML = '${ attributes.originalContent.replace(
					/\n/g,
					'\\n'
				) }';
                let blocks = window.wp.blocks.parse(blockHTML);
                window.wp.data.dispatch('core/block-editor').resetBlocks(blocks);
			}, 0);
		};
		
			window.onload = () => {
			const wpAdminBar = document.getElementById('wpadminbar');
			const wpToolbar = document.getElementById('wp-toolbar');
			if (wpAdminBar) {
				wpAdminBar.style.display = 'none';
			}
			if (wpToolbar) {
				wpToolbar.style.display = 'none';
			}
		
			const content = document.getElementById('wpbody-content');
			if (content) {
				const callback = function(mutationsList, observer) {
					const header = document.getElementsByClassName("edit-post-header")[0];
					const postTitle = document.getElementById('post-title-0');
					if (postTitle && header.id == '') {
						header.id = 'gb-header';
						header.style.height = 0;
						postTitle.style.display = 'none';
						Array.from(header.children).forEach( (child) => {
							child.style.display = 'none';
						});
		
						const headerToolbar = header.getElementsByClassName('edit-post-header-toolbar')[0];
						headerToolbar.style.display = null;
						headerToolbar.parentNode.style.display = null;
						const inserterToggle = header.getElementsByClassName('block-editor-inserter__toggle')[0];
						inserterToggle.style.display = 'none';
		
						const blockToolbar = header.getElementsByClassName('edit-post-header-toolbar__block-toolbar')[0];
						blockToolbar.style.top = '0px';
		
						const skeleton = document.getElementsByClassName('block-editor-editor-skeleton')[0];
		//                skeleton.style.top = '0px';
		
						const appender = document.getElementsByClassName('block-list-appender')[0];
						if (appender && appender.id == '') {
							appender.id = 'appender';
							appender.style.display = 'none';
						}
		
						window.insertBlock();
						observer.disconnect();
					}
				};
				const observer = new MutationObserver(callback);
				const config = { attributes: true, childList: true, subtree: true };
				observer.observe(content, config);
			}
		  }
		  `;

		return (
			<>
				<Modal
					animationType="slide"
					presentationStyle="fullScreen"
					visible={ this.state.isModalVisible }
					onRequestClose={ () =>
						this.setState( { isModalVisible: false } )
					}
				>
					<SafeAreaView
						style={ { flex: 1, backgroundColor: 'black' } }
					>
						{ /* <View> */ }
						<Button
							onPress={ () =>
								this.setState( { isModalVisible: false } )
							}
							title="Close"
							color="white"
						/>
						<Button
							onPress={ () =>
								this.webref.injectJavaScript(
									'window.onSave()'
								)
							}
							title="Save"
							color="white"
						/>
						{ /* </View> */ }
						<WebView
							ref={ ( r ) => ( this.webref = r ) }
							source={ {
								uri:
									'https://cruisinglamb.wordpress.com/wp-admin/post-new.php',
							} }
							injectedJavaScript={ runFirst }
							// injectedJavaScriptForMainFrameOnly={false}
							onMessage={ ( event ) => {
								attributes.originalContent =
									event.nativeEvent.data;
								this.setState( { isModalVisible: false } );
							} }
						/>
					</SafeAreaView>
				</Modal>
				<BottomSheet
					isVisible={ this.state.showHelp }
					hideHeader
					onClose={ this.toggleSheet }
				>
					<View style={ styles.infoContainer }>
						<Icon
							icon={ help }
							color={ infoSheetIconStyle.color }
							size={ styles.infoSheetIcon.size }
						/>
						<Text style={ [ infoTextStyle, infoTitleStyle ] }>
							{ infoTitle }
						</Text>
						<Text style={ [ infoTextStyle, infoDescriptionStyle ] }>
							{ __(
								'We are working hard to add more blocks with each release. In the meantime, you can also edit this post on the web.'
							) }
						</Text>
					</View>
					{ // eslint-disable-next-line no-undef
					__DEV__ && (
						<>
							<BottomSheet.Cell
								label={ __( 'Edit post on Web Browser' ) }
								separatorType="topFullWidth"
								onPress={ () => {
									this.toggleSheet();
									this.timeout = setTimeout( () => {
										this.setState( {
											isModalVisible: true,
										} );
									}, 1000 );
								} }
							/>
							<BottomSheet.Cell
								label={ __( 'Dismiss' ) }
								separatorType="topFullWidth"
								onPress={ this.toggleSheet }
							/>
						</>
					) }
				</BottomSheet>
			</>
		);
	}

	render() {
		const { originalName } = this.props.attributes;
		const { getStylesFromColorScheme, preferredColorScheme } = this.props;
		const blockType = coreBlocks[ originalName ];

		const title = blockType ? blockType.settings.title : originalName;
		const titleStyle = getStylesFromColorScheme(
			styles.unsupportedBlockMessage,
			styles.unsupportedBlockMessageDark
		);

		const subTitleStyle = getStylesFromColorScheme(
			styles.unsupportedBlockSubtitle,
			styles.unsupportedBlockSubtitleDark
		);
		const subtitle = (
			<Text style={ subTitleStyle }>{ __( 'Unsupported' ) }</Text>
		);

		const icon = blockType
			? normalizeIconObject( blockType.settings.icon )
			: plugins;
		const iconStyle = getStylesFromColorScheme(
			styles.unsupportedBlockIcon,
			styles.unsupportedBlockIconDark
		);
		const iconClassName = 'unsupported-icon' + '-' + preferredColorScheme;
		return (
			<View
				style={ getStylesFromColorScheme(
					styles.unsupportedBlock,
					styles.unsupportedBlockDark
				) }
			>
				{ this.renderHelpIcon() }
				<Icon
					className={ iconClassName }
					icon={ icon && icon.src ? icon.src : icon }
					color={ iconStyle.color }
				/>
				<Text style={ titleStyle }>{ title }</Text>
				{ subtitle }
				{ this.renderSheet( title ) }
			</View>
		);
	}
}

export default withPreferredColorScheme( UnsupportedBlockEdit );
